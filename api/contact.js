/* 
    Small serverless function designed to work with resend and vercel servless functions.
    They both have a generous free tier, so we should be able to send contact forms to our clients
    without authentication hassle for probably only a few pennies per month.
*/

import { Resend } from "resend";
import "dotenv/config"; // for local env variables

const resend = new Resend(process.env.RESEND_API_KEY);

// Add client email + allowed fields here (NAMES MUST MATCH EXACTLY HOW YOU HAVE THEM IN THE FRONTEND)
const CLIENTS = {
    // Richard
    "thedeckbuilderofcolorado@gmail.com": {
        allowedFields: ["name", "phone", "email", "projectType", "message"]
    },

    // John
    "jfranco@jfrancomarketing.com": {
        allowedFields: [
            "firstName","lastName", "email", "phone", "bestTime", "businessName",
            "city", "state", "timeline", "notes", "terms"
        ]
    },
};

// any clienT site needs to be inccluded -> include both www and without versions
const allowedOrigins = [
    "http://localhost:3000",

    // Richard's Site
    "https://www.deckbuilderofco.com",
    "https://deckbuilderofco.com",

    // John Site
    "https://automailfast.com",
    "https://www.automailfast.com"
];

function setCors(res, origin) {
    if (allowedOrigins.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function (req, res) {
    const origin = req.headers.origin;
    setCors(res, origin);

    // IMPORTANT: handle preflight
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" }); // only allow post requests

    try {
        const { destination, data } = req.body;

        const client = CLIENTS[destination];

        if (!client) {
            return res.status(403).json({ error: "Destination not allowed" });
        }

        const filtered = {};

        for (const field of client.allowedFields) {
            if (data[field] !== undefined) {
                filtered[field] = data[field];
            }
        }

        const html = Object.entries(filtered)
            .map(([key, value]) => `<p><b>${key}</b>: ${value}</p>`)
            .join("");

        const result = await resend.emails.send({
            from: "form-submissions@sprucedev.com",
            //from: "onboarding@resend.dev", // resend testing domain
            to: destination,
            replyTo: filtered.email,
            subject: "New Contact Form Submission",
            html: `
                <h2>New Submission</h2>
                ${html}
            `
        });

        return res.json({ success: true, result });
    } catch (err) {
        console.error(err);

        return res.status(500).json({
            error: "Send failed"
        });
    }
}