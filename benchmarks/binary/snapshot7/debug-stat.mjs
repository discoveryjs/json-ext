export let stat = createStat();
export function resetStat() {
    stat = createStat();
}

function createStat() {
    return new Proxy(Object.create(null), {
        get(target, name) {
            if (Object.hasOwn(target, name)) {
                return Reflect.get(...arguments);
            }

            return target[name] = 0;
        }
    });
}
