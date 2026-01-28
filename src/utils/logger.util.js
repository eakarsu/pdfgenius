// utils/logger.util.js
const originalLog = console.log.bind(console);
const originalError = console.error.bind(console);

const setupLogger = () => {
    console.log = function() {
        const timestamp = '[' + new Date().toISOString() + '] ';
        const args = Array.prototype.slice.call(arguments);
        args.unshift(timestamp);
        originalLog.apply(console, args);
    };

    console.error = function() {
        const timestamp = '[' + new Date().toISOString() + '] ERROR: ';
        const args = Array.prototype.slice.call(arguments);
        args.unshift(timestamp);
        originalError.apply(console, args);
    };
};

module.exports = {
    setupLogger
};

