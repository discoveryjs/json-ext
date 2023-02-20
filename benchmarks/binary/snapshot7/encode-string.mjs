export function findCommonStringPrefix(string1, string2) {
    const maxLength = Math.min(string1.length, string2.length);

    if (maxLength >= 3) {
        let i = 0;

        for (; i < maxLength; i++) {
            if (string1[i] !== string2[i]) {
                break;
            }
        }

        if (i >= 3) {
            return i;
        }
    }

    return 0;
}

export function findCommonStringPostfix(string1, string2, start2) {
    const maxLength = Math.min(string1.length, string2.length - start2);

    if (maxLength >= 3) {
        let i = 0;

        for (; i < maxLength; i++) {
            if (string1[string1.length - 1 - i] !== string2[string2.length - 1 - i]) {
                break;
            }
        }

        if (i >= 3) {
            return -i;
        }
    }

    return 0;
}

function writeStringsSection(strings, stringsMap, stringDefs, stringSlices, stringRefRemap, offset) {
    strings.sort();

    let allStrings = '';
    let prevString = '';

    for (const str of strings) {
        const stringIdx = offset++;
        const start = findCommonStringPrefix(prevString, str);
        const end = findCommonStringPostfix(prevString, str, start) || str.length;
        const prefixSlice = start > 0;
        const postfixSlice = end < 0;
        const payload = prefixSlice || postfixSlice
            ? str.slice(start, end)
            : str;

        stringRefRemap[stringsMap.get(str)] = stringIdx;
        stringDefs[stringIdx] = (payload.length << 2) | (prefixSlice << 1) | (postfixSlice << 0);
        allStrings += payload;
        prevString = str;

        if (prefixSlice) {
            stringSlices.push(start);
        }

        if (postfixSlice) {
            stringSlices.push(-end);
        }
    }

    return allStrings;
}

export function writeStrings(stringsMap, stringRefs, writer, writeArray) {
    const strings = [...stringsMap.keys()];
    const stringDefs = new Array(stringsMap.size);
    const stringSlices = [];
    const stringRefCount = new Uint32Array(stringsMap.size);
    const stringRefRemap = new Uint32Array(stringsMap.size);
    const referredStringsSet = new Set();
    const refToString = refIdx => strings[refIdx];
    let allStrings = '';
    let offset = 0;

    // Count string references and collect strings referred more than once
    for (let refIdx of stringRefs) {
        if (++stringRefCount[refIdx] > 1) {
            referredStringsSet.add(refIdx);
        }
    }

    // Sort referred strings by number of references
    const referredStrings = [...referredStringsSet].sort((a, b) => stringRefCount[b] - stringRefCount[a]);

    // Write most refererred strings first
    // Strings are sectioned by 1-byte vlq, 2-bytes vlq and the rest
    for (let range of [[0, 127], [127, 0x3fff]]) {
        if (referredStrings.length > offset) {
            const stringsSlice = referredStrings.slice(range[0], range[1]).map(refToString);
            allStrings += writeStringsSection(stringsSlice, stringsMap, stringDefs, stringSlices, stringRefRemap, offset);
            offset += stringsSlice.length;
        }
    }

    allStrings += writeStringsSection(
        referredStrings.slice(offset).map(refToString)
            .concat(strings.filter((_, refIdx) => !referredStringsSet.has(refIdx))),
        stringsMap,
        stringDefs,
        stringSlices,
        stringRefRemap,
        offset
    );

    // Remap references to use less bytes for references to most used strings
    for (let i = 0; i < stringRefs.length; i++) {
        stringRefs[i] = stringRefRemap[stringRefs[i]];
    }

    // Write string bytes
    writer.reset();
    writeArray(stringDefs, false, null, false);
    writeArray(stringSlices, false, null, false);
    writer.writeString(allStrings, 0);
    writeArray(stringRefs, false, null, false);

    return writer.value;
}
