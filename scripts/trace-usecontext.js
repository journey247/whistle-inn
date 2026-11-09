// Preload script to wrap React.useContext and capture call stacks when it fails
try {
    const react = require('react');
    const origUseContext = react.useContext;
    react.useContext = function () {
        try {
            return origUseContext.apply(this, arguments);
        } catch (err) {
            // Log a clear, source-mapped stack and some surrounding context
            console.error('\n=== React.useContext wrapper caught an error ===');
            console.error('Error message:', err && err.message);
            console.error('Error stack:', err && err.stack);
            console.error('Wrapper call stack:', new Error().stack);
            try {
                const ctx = arguments[0];
                console.error('useContext called with:', ctx && (ctx.displayName || ctx._context || ctx));
            } catch (e) {
                // ignore
            }
            // Do NOT immediately exit here; let Next print its own error after we log context.
            throw err;
        }
    };
    console.log('trace-usecontext: installed React.useContext wrapper');
} catch (e) {
    // If React isn't available yet, that's fine; the require hook will run later when needed
    try { console.error('trace-usecontext: could not patch react at startup:', e && e.message); } catch (e) { }
}
