export class BuchtaLogger {
    private ERROR = "\u001b[31;1m";
    private WARNING = "\u001b[33;1m";
    private INFO = "\u001b[34;1m";
    private SUCCESS = "\u001b[32;1m";
    private NEUTRAL = "\u001b[0m";

    public shut = false;
    
    info = (message: string) => {
        if (!this.shut) {
            console.log(`[${this.INFO} INFO ${this.NEUTRAL}]: ${message}`);
        }
    }

    success = (message: string) => {
        if (!this.shut) {
            console.log(`[${this.SUCCESS} DONE ${this.NEUTRAL}]: ${message}`);
        }
    }

    warning = (message: string) => {
        if (!this.shut) {
            console.log(`[${this.WARNING} WARN ${this.NEUTRAL}]: ${message}`);
        }
    }

    error = (message: string) => {
        if (!this.shut) {
            console.log(`[${this.ERROR} FAIL ${this.NEUTRAL}]: ${message}`);
        }
    }
}