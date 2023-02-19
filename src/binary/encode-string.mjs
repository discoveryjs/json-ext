export function findCommonStringPrefix(string1, string2) {
    const maxLength = Math.max(string1.length, string2.length);

    if (maxLength > 4) {
        for (let i = 0; i < maxLength; i++) {
            if (string1[i] !== string2[i]) {
                if (i > 4) {
                    return i;
                }
                break;
            }
        }

        // for (let i = 0; i < maxLength; i++) {
        //     if (prev[prev.length - 1 - i] !== value[value.length - 1 - i]) {
        //         if (i > 4 && i > substrLen) {
        //             substrLen = -i;
        //         }
        //         break;
        //     }
        // }
    }

    return 0;
}

export function findCommonStringPostfix(prev, value) {
    return 0;
    const maxLength = Math.max(prev.length, value.length);

    if (maxLength > 4) {
        for (let i = 0; i < maxLength; i++) {
            if (prev[prev.length - 1 - i] !== value[value.length - 1 - i]) {
                if (i > 4) {
                    return -i;
                }
                break;
            }
        }
    }

    return 0;
}
