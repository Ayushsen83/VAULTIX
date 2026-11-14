
// export default async function handler(req, res) {
//   const backendUrl = process.env.BACKEND_URL;

//   if (!backendUrl) {
//     return res.status(500).json({
//       message: "Backend URL is not configured",
//     });
//   }

//   const path = Array.isArray(req.query.path)
//     ? req.query.path.join("/")
//     : "";

//   const queryIndex = req.url.indexOf("?");
//   const query = queryIndex >= 0
//     ? req.url.slice(queryIndex)
//     : "";

//   const targetUrl =
//     `${backendUrl.replace(/\/$/, "")}/api/${path}${query}`;

//   try {
//     const response = await fetch(targetUrl, {
//       method: req.method,
//       headers: {
//         ...req.headers,
//         host: new URL(backendUrl).host,
//       },
//       body: ["GET", "HEAD"].includes(req.method)
//         ? undefined
//         : req,
//       redirect: "manual",
//       duplex: "half",
//     });

//     response.headers.forEach((value, key) => {
//       if (!["transfer-encoding", "connection"].includes(key.toLowerCase())) {
//         res.setHeader(key, value);
//       }
//     });

//     res.status(response.status);

//     if (!response.body) {
//       return res.end();
//     }

//     const buffer = Buffer.from(await response.arrayBuffer());
//     return res.send(buffer);
//   } catch (error) {
//     console.error("Backend proxy error:", error);
//     return res.status(502).json({
//       message: "Backend service unavailable",
//     });
//   }
// }
