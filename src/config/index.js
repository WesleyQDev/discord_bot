require('dotenv').config();

const config = {
    discord: {
        token: process.env.DISCORD_BOT_TOKEN,
        color: '630000'
    },
    allowedChannels: [
        '1325942988345704579',
        '1333208876711018597',
        '1328712688565620769',
        '1331426140753231993'
    ],
    cooldowns: {
        channel: 1000,
        user: 1000
    },
    moderation: {
        maxWarnings: 3,
        prohibited: ['http', 'www', '@everyone', 'discord.gg'],
        blacklist: []
    },
    responseChances: {
        mention: 1.0,
        question: 0.45,
        greeting: 0.30,
        emotion: 0.20,
        general: 0.15
    }
};

module.exports = config;