// Local/JSON storage fallback for Direct Messages
const messages = [];

class Message {
    constructor(data) {
        this.from = data.from;
        this.to = data.to;
        this.message = data.message;
        this.timestamp = data.timestamp || new Date();
        this.read = data.read || false;
    }

    static async find(query) {
        return messages.filter(m => {
            // Support $or array
            if (query.$or) {
                return query.$or.some(q => {
                    return Object.entries(q).every(([k, v]) => m[k] === v);
                });
            }
            // Support direct to/from check
            if (query.to && query.from) {
                const matchToFrom = (m.to === query.to && m.from === query.from);
                const matchFromTo = (m.to === query.from && m.from === query.to);
                return matchToFrom || matchFromTo;
            }
            // Support generic key-value match
            return Object.entries(query).every(([k, v]) => m[k] === v);
        }).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    static async updateMany(query, update) {
        messages.forEach(m => {
            if (m.to === query.to && m.from === query.from) {
                if (update.read !== undefined) m.read = update.read;
            }
        });
        return { modifiedCount: 1 };
    }

    async save() {
        messages.push(this);
        return this;
    }
}

module.exports = Message;
