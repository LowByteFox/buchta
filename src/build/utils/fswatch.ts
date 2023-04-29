import * as EventEmitter from 'node:events';
import { statSync } from 'node:fs';

// 💾👀 polyfill
export function fswatch(filepath: string, _opts: any, listener?: (eventType: string) => void) {
    class FSWatcher extends EventEmitter {
        public prevstat;
        #interval: null | number = null;
        constructor(file: typeof filepath, cb?: typeof listener) {
            super();
            this.prevstat = statSync(file).mtime;
            this.#interval = setInterval(() => {
                try {
                    const { mtime } = statSync(file);
                    if (mtime > this.prevstat) {
                        this.prevstat = mtime;
                        this.emit('change', 'change');
                        cb?.('change');
                    }
                } catch (e) {
                    this.emit('error', e);
                }
            }, 1250);
        }
        
        close() {
            if (this.#interval)
                clearInterval(this.#interval);
            this.#interval = null;
            this.emit('close');
        }

        ref() { return this; } 
        unref() {
            throw new Error('cant unref() FSWatcher polyfill');
        }
    }
    return new FSWatcher(filepath, listener);
}
