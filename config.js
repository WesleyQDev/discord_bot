require('dotenv').config()

const config = {
    discord: {
        token: process.env.DISCORD_BOT_TOKEN,
        color: '630000'
    }
}

module.exports = config