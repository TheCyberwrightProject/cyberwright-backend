export class Queue {
    private queue: string[] //Contains uploads ids to scan
    private isPaused: boolean
    private sleepTime: number

    constructor() {
        this.queue = []
        this.isPaused = false;
        this.sleepTime = 0;
    }

    // Adds job to back of the queue
    addJob(uid: string) {
        const pos = this.queue.push(uid);
        return pos - 1;
    }

    //Removes job at the front of the queue
    dequeue() {
        this.queue.shift()
    }

    removeJob(uid: string) {
        let index = -1;
        for(let i = 0; i < this.queue.length; i++) {
            if(this.queue[i] === uid) {
                index = i;
                break;
            }
        }
        if(index === -1) { return }
        this.queue.splice(index, 1);
    }

    // Gets job at front of the queue
    front() {
        return this.queue[0];
    }

    size() {
        return this.queue.length;
    }

    pause(pauseTime: number) {
        this.isPaused = true;
        this.sleepTime = pauseTime
    }

    resume() {
        this.isPaused = false;
        this.sleepTime = 0;
    }

    paused() {
        return this.isPaused;
    }

    findJob(uid: string) {
        return this.queue.indexOf(uid);
    }

    pushFront(uid: string) {
        this.queue.unshift(uid);
    }
}