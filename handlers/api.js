const config = require('../config.json');
const express = require('express');
const app = express();
app.use(express.json());
app.use(require('cors')());

module.exports = async () => {
    if (config.api.enabled) {
        const auth = async (req, res, next) => {
            const endpoint = req.path.split('/')[1];
            if (!['chat', 'invite', 'kick', 'mute', 'setrank', 'unmute'].includes(endpoint))
                return res.status(404).send({ error: 'Endpoint not found' });

            let providedKey;
            if (req.headers.hasOwnProperty('authorization')) providedKey = req.headers.authorization;
            if (req.query.hasOwnProperty('key')) providedKey = req.query.key;

            for (const [key, commands] of Object.entries(config.api.keys)) {
                if (key === providedKey && commands.includes(endpoint)) {
                    next();
                    return;
                }
            }
            res.status(401).send({ error: 'Invalid key or no key provided' });
        };
        app.use(auth);

        app.post('/chat', async (req, res) => {
            try {
                const { author, message } = req.body;
                if (!author || !message) return res.status(400).send({ error: 'Missing author or message' });

                if (minecraftClient?.player) {
                    minecraftClient.chat(`/gc ${author}: ${message}`);

                    return res.status(200).send({ success: true });
                }
                return res.status(409).send({ error: 'Not connected to Minecraft' });
            } catch (e) {
                return res.status(500).send({ error: 'Internal server error' });
            }
        });
        app.post('/invite', async (req, res) => {
            try {
                const { player } = req.body;
                if (!player) return res.status(400).send({ error: 'Missing player' });

                if (minecraftClient?.player) {
                    minecraftClient.chat(`/g invite ${player}`);

                    return res.status(200).send({ success: true });
                }
                return res.status(409).send({ error: 'Not connected to Minecraft' });
            } catch (e) {
                return res.status(500).send({ error: 'Internal server error' });
            }
        });
        app.post('/kick', async (req, res) => {
            try {
                const { player, reason } = req.body;
                if (!player || !reason) return res.status(400).send({ error: 'Missing player or reason' });

                if (minecraftClient?.player) {
                    minecraftClient.chat(`/g kick ${player} ${reason}`);

                    return res.status(200).send({ success: true });
                }
                return res.status(409).send({ error: 'Not connected to Minecraft' });
            } catch (e) {
                return res.status(500).send({ error: 'Internal server error' });
            }
        });
        app.post('/mute', async (req, res) => {
            try {
                const { player, time } = req.body;
                if (!player || !time) return res.status(400).send({ error: 'Missing player or time' });

                if (minecraftClient?.player) {
                    minecraftClient.chat(`/g mute ${player} ${time}`);

                    return res.status(200).send({ success: true });
                }
                return res.status(409).send({ error: 'Not connected to Minecraft' });
            } catch (e) {
                return res.status(500).send({ error: 'Internal server error' });
            }
        });
        app.post('/setrank', async (req, res) => {
            try {
                const { player, rank } = req.body;
                if (!player || !rank) return res.status(400).send({ error: 'Missing player or rank' });

                if (minecraftClient?.player) {
                    minecraftClient.chat(`/g setrank ${player} ${rank}`);

                    return res.status(200).send({ success: true });
                }
                return res.status(409).send({ error: 'Not connected to Minecraft' });
            } catch (e) {
                return res.status(500).send({ error: 'Internal server error' });
            }
        });
        app.post('/unmute', async (req, res) => {
            try {
                const { player } = req.body;
                if (!player) return res.status(400).send({ error: 'Missing player' });

                if (minecraftClient?.player) {
                    minecraftClient.chat(`/g unmute ${player}`);

                    return res.status(200).send({ success: true });
                }
                return res.status(409).send({ error: 'Not connected to Minecraft' });
            } catch (e) {
                return res.status(500).send({ error: 'Internal server error' });
            }
        });
        app.listen(config.api.port, () => {
            console.log(`API listening on port ${config.api.port}`);
        });
    }
};
