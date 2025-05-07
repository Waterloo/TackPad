// server/middleware/js-mime.js
export default defineEventHandler(async (event) => {

    if (event.path.startsWith('/scripts/bookmarklet.js')) {
        console.log("hi")
      event.res.setHeader('Content-Type', 'application/javascript');
    }
});