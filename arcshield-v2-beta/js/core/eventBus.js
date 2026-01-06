class EventBus {
    constructor() {
        this.events = {};
    }

    // Inscrever-se para ouvir um evento
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    // Emitir um evento (avisar que algo aconteceu)
    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => callback(data));
        }
    }
    
    // Remover inscrição (limpeza de memória)
    off(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
}

export const bus = new EventBus();