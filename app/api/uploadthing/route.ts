import { createRouteHandler } from "uploadthing/next";
import { researchFileRouter } from "./core";

// The browser asks here for permission to upload (the router's middleware checks the user), and UploadThing calls back
// here, signed, once a file is stored.
export const { GET, POST } = createRouteHandler({ router: researchFileRouter });
