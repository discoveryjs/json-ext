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

function writeStringsSection(stringRefs, strings, stringDefs, stringSlices, stringRefRemap, offset) {
    let allStrings = '';
    let prevString = '';

    stringRefs.sort((a, b) => strings[a] < strings[b] ? -1 : 1);

    for (let i = 0; i < stringRefs.length; i++) {
        const stringIdx = stringRefs[i];
        const str = strings[stringIdx];
        const newStringIdx = offset++;
        const start = findCommonStringPrefix(prevString, str);
        const end = findCommonStringPostfix(prevString, str, start) || str.length;
        const prefixSlice = start > 0;
        const postfixSlice = end < 0;
        const payload = prefixSlice || postfixSlice
            ? str.slice(start, end)
            : str;

        stringRefRemap[stringIdx] = newStringIdx;
        stringDefs[newStringIdx] = (payload.length << 2) | (prefixSlice << 1) | (postfixSlice << 0);
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

export function writeStrings(strings, stringRefs, writer, writeArray) {
    const stringDefs = new Uint32Array(strings.length);
    const stringSlices = [];
    const stringRefCount = new Uint32Array(strings.length);
    const stringRefRemap = new Uint32Array(strings.length);
    const referredStringsSet = new Set();
    let allStrings = '';
    let offset = 0;

    // Count string references and collect strings referred more than once
    for (let i = 0; i < stringRefs.length; i++) {
        const refIdx = stringRefs[i];

        if (stringRefCount[refIdx]++ === 2) {
            // Add a string to the set only when there are more than 1 reference
            // (1st reference is a string definition)
            referredStringsSet.add(refIdx);
        }
    }

    // Sort referred strings by number of references
    const referredStrings = new Uint32Array(referredStringsSet).sort((a, b) => stringRefCount[b] - stringRefCount[a]);

    // Write most refererred strings first
    // Strings are sectioned by 1-byte vlq, 2-bytes vlq and the rest
    for (let range of [[0, 127], [127, 0x3fff]]) {
        if (referredStrings.length > offset) {
            const referredStringsSlice = referredStrings.subarray(range[0], range[1]);

            allStrings += writeStringsSection(referredStringsSlice, strings, stringDefs, stringSlices, stringRefRemap, offset);
            offset += referredStringsSlice.length;

            for (let i = 0; i < referredStringsSlice.length; i++) {
                stringRefCount[referredStringsSlice[i]] = 0;
            }
        }
    }

    for (let i = 0, k = 0; i < stringRefCount.length; i++) {
        if (stringRefCount[i] !== 0) {
            stringRefCount[k++] = i;
        }
    }

    allStrings += writeStringsSection(
        stringRefCount.subarray(0, stringRefCount.length - offset),
        strings,
        stringDefs,
        stringSlices,
        stringRefRemap,
        offset
    );

    // Remap references to use less bytes for references for most used strings
    for (let i = 0; i < stringRefs.length; i++) {
        stringRefs[i] = stringRefRemap[stringRefs[i]];
    }

    // Write string bytes
    writer.reset();
    writeArray(stringDefs, false, null, false);
    writeArray(stringSlices, false, null, false);
    writer.writeString(allStrings, 0);
    writeArray(stringRefs, false, null, false);

    const stringBytes = writer.value;

    return stringBytes;
}
