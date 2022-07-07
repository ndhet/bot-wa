const { commands, listCommands } = require('@libs/constants/command/command.constant')
const { watchFile, existsSync, writeFileSync } = require('fs')
const { logger } = require('../logger/logger.util')
const { GlobSync } = require('glob')
const cron = require('node-cron')
const rimraf = require('rimraf')
const path = require('path')
const config = require('@config')

class Utility {
    constructor() {
        Promise.all([this.deleteSession(), this.registerCommand(), this.initCronJob(), this.initDatabase()])
    }

    getAllFiles(directory) {
        const pathFiles = new GlobSync(path.join(directory, '**', '*.js').replace(/\\/g, '/')).found
        const files = []
        for (let file of pathFiles) {
            const basename = path.parse(file).name.toLowerCase()
            files.push({
                basename,
                file,
            })
        }
        return files
    }

    deleteSession() {
        const sessionFiles = new GlobSync('session/*-jadibot-session').found
        if (sessionFiles.length !== 0) {
            sessionFiles.forEach((v) => rimraf.sync(v))
            logger.stats('Clear session jadibot')
        }
    }

    initDatabase() {
        const userPath = path.resolve(config.rootPath, 'libs', 'databases', 'json', 'users.json')
        if (!existsSync(userPath)) {
            writeFileSync(userPath, JSON.stringify({}))
            logger.stats('Create database users.json')
        } else {
            logger.stats('Init database users.json')
        }
    }

    initCronJob() {
        cron.schedule('0 0 * * *', async () => {})
        logger.stats('CronJob init')
    }

    registerCommand() {
        const files = this.getAllFiles(path.join(__dirname, '..', '..', '..', 'commands'))
        for (let { basename, file } of files) {
            if (commands.get(basename)) {
                continue
            } else if (!require(file).callback) {
                continue
            } else {
                commands.set(basename, require(file))
                watchFile(file, () => {
                    const dir = path.resolve(file)
                    if (dir in require.cache) {
                        delete require.cache[dir]
                        commands.set(basename, require(file))
                        logger.stats(`reloaded ${basename}`)
                    }
                })
            }
        }

        for (let x of commands.keys()) {
            let command = commands.get(x)
            let category = command?.category
            if (!category) {
                continue
            }
            if (!listCommands[category]) {
                listCommands[category] = []
            }

            !listCommands[category].includes(x) && listCommands[category].push(x)
        }

        logger.stats(`Loaded commands ${commands.size} of ${files.length}`)
    }
}

module.exports = {
    Utility,
}
