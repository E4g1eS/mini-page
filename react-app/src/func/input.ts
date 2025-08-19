import {
  getTypedElementsByClass as getTypedElementByClass,
  sleep,
} from "./utils";
import { createScopedLog, LogSeverity } from "./logging";

const log = createScopedLog("Input");

export class UserInput {
  listenOnClass: string;

  constructor(listenOnClass: string) {
    this.listenOnClass = listenOnClass;
  }

  async init() {
    const RETRY_FREQUENCY = 1000;

    while (true) {
      const elements = document.getElementsByClassName(this.listenOnClass);

      if (elements.length === 0) {
        await sleep(RETRY_FREQUENCY);
        continue;
      }

      if (elements.length > 1)
        log(`Multiple "${this.listenOnClass}" elements.`, LogSeverity.WARNING);

      const element = elements[0];
      element.addEventListener("keydown", this.handleKeyDown.bind(this));
      element.addEventListener("keyup", this.handleKeyUp.bind(this));
      return;
    }
  }

  handleKeyDown(event: Event) {
    const keyboardEvent = event as KeyboardEvent;
    log(`Key down: ${keyboardEvent.code} `, LogSeverity.VERBOSE);
  }
  
  handleKeyUp(event: Event) {
    const keyboardEvent = event as KeyboardEvent;
    log(`Key up: ${keyboardEvent.code} `, LogSeverity.VERBOSE);
  }
}
