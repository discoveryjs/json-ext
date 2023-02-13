export function findCommonStringPrefix(string1, string2) {
    const maxLength = Math.max(string1.length, string2.length);
    let substrLen = 0;

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

    return substrLen;
}

// function findCommonSubstring2(prev, value) {
//     const maxLength = Math.max(prev.length, value.length);
//     let substrLen = 0;

//     if (maxLength > 4) {
//         for (let i = 0; i < maxLength; i++) {
//             if (prev[prev.length - 1 - i] !== value[value.length - 1 - i]) {
//                 if (i > 4) {
//                     substrLen = -i;
//                 }
//                 break;
//             }
//         }
//     }

//     return substrLen;
// }
