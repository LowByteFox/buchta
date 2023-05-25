export class EventManager {
    private events: Map<string, any[]> = new Map();

    on(name: string, func: (...args: any[]) => void) {
        // for perfomance
        let arr = this.events.get(name) ?? [];

        arr.push(func);
        if (arr.length == 1) this.events.set(name, arr);
    }

    protected emit(name: string, ...args: any[]) {
        // for perfomance
        let iterArr = this.events.get(name) ?? [];
        let length = iterArr.length;
        for (let i = 0;i < length; i++) {
            iterArr[i](...args);
        }
    }
}
