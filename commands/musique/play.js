const YouTube = require('simple-youtube-api');
const moment = require('moment');
const ytdl = require('ytdl-core');
const { Command } = require('discord.js-commando');
const { Song,deleteCommandMessages } = require('../../utils.js');
const emojis = ['1⃣', '2⃣', '3⃣', '4⃣', '5⃣','❌'];

const run = (current) => async (msg, { url }) =>  {
    deleteCommandMessages(msg);
    const queue = current.queue.get(msg.guild.id);

    let voiceChannel;

    if (!queue) {
        voiceChannel = msg.member.voice.channel;
        if (!voiceChannel) {
            return msg.reply('Veuillez rejoindre un salon vocal pour lancer une musique.');
        }

        const permissions = voiceChannel.permissionsFor(msg.client.user);

        if (!permissions.has('CONNECT')) {
            return msg.reply('Je n\'ai pas la permission de rejoindre un salon vocal.');
        }
        if (!permissions.has('SPEAK')) {
            return msg.reply('jJe n\'ai pas la permission de parler dans un salon vocal.');
        }
    } else if (!queue.voiceChannel.members.has(msg.author.id)) {
        return msg.reply('Veuillez rejoindre un salon vocal pour lancer une musique.');
    }

    let statusMsg = await msg.reply('traitement de la demande...');

    if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
        await statusMsg.edit('Obtention des vidéos de la playlist ... (cela peut prendre un certain temps en fonction de la longueur de la liste)');
        const playlist = await current.youtube.getPlaylist(url),
            videos = await playlist.getVideos();

        let video2 = null;

        if (!queue) {
            const listQueue = {
                textChannel: msg.channel,
                loop: false,
                timeLaps: null,
                voiceChannel,
                connection: null,
                songs: [],
                volume: 1
            };

            current.queue.set(msg.guild.id, listQueue);

            statusMsg.edit(`${msg.author}, je rejoins votre salon vocal...`);
            try {
                const connection = await listQueue.voiceChannel.join();

                listQueue.connection = connection;
            } catch (error) {
                console.log('Play command => connexion with link',error)
                current.queue.delete(msg.guild.id);
                statusMsg.edit(`${msg.author}, impossible de rejoindre votre salon vocal.`);

                return null;
            }
        }

        for (const video of Object.values(videos)) {
            try {
                video2 = await current.youtube.getVideoByID(video.id);
            } catch (err) {
                null;
            }
            await current.handlePlaylist(video2, playlist, queue, voiceChannel, msg, statusMsg);
        }

        if (!current.queue.get(msg.guild.id, queue).playing) current.play(msg.guild, current.queue.get(msg.guild.id, queue).songs[0]);

        return null;
    }
    try {
        const video = await current.youtube.getVideo(url);
        return current.handleVideo(video, queue, voiceChannel, msg, statusMsg);
    } catch (error) {
        try {
            statusMsg.edit(`${msg.author}, recherche des musiques disponibles...`);
            const videos = await current.youtube.searchVideos(url, 5);
            if (!videos[0] || !videos) {
                return statusMsg.edit(`${msg.author}, il n'y a aucun résultats.`);
            }

            const description = videos.reduce((prev, curr, i) => {
              return `${prev}\n${emojis[i]} | [${videos[i].title}](https://www.youtube.com/watch?v=${videos[i].id})`;
            }, `Ajoutez une réaction à la musique de votre choix pour la lancer !\n`);

            musicsList = {
                color: 0xcd6e57,
                title: 'Liste des musiques disponibles',
                description: description
            };

            const bot = msg.client;

            const sendedEmbed = await msg.embed(musicsList);
            const [reactMessage] = await [sendedEmbed, videos.map((_, index) => emojis[index])]
            emojis.reduce((acc, emoji) => acc.then(() => reactMessage.react(emoji).catch(() => null)), Promise.resolve())
            bot.on('messageReactionAdd', startReactEvent(msg,videos,sendedEmbed,current,queue,voiceChannel,statusMsg));
        } catch (err) {
            console.log('Play command => react system',err)
            return statusMsg.edit(`${msg.author}, impossible d'obtenir les détails de la vidéo recherchée.`);
        }
    }
}

const handleVideo = (current) => async (video, queue, voiceChannel, msg, statusMsg) => {
    if (moment.duration(video.raw.contentDetails.duration, moment.ISO_8601).asSeconds() === 0) {
        statusMsg.edit(`${msg.author}, vous ne pouvez pas lire les flux en direct.`);
        return null;
    }

    if (!queue) {
        queue = {
            textChannel: msg.channel,
            voiceChannel,
            connection: null,
            songs: [],
            volume: 1
        };
        current.queue.set(msg.guild.id, queue);

        const result = await current.addSong(msg, video),
            resultMessage = {
                color: 0xcd6e57,
                author: {
                    name: `${msg.author.tag}`,
                    iconURL: msg.author.displayAvatarURL({ format: 'png' })
                },
                description: result
            };

        if (!result.startsWith('👍')) {
            current.queue.delete(msg.guild.id);
            statusMsg.edit('', { embed: resultMessage });

            return null;
        }

        statusMsg.edit(`${msg.author}, je rejoins votre salon vocal...`);
        try {
            const connection = await queue.voiceChannel.join();

            queue.connection = connection;
            current.play(msg.guild, queue.songs[0]);
            if(statusMsg) statusMsg.delete();

            return null;
        } catch (error) {
            console.log('Play command => join in the handle',error)
            current.queue.delete(msg.guild.id);
            statusMsg.edit(`${msg.author}, impossible de rejoindre votre salon vocal.`);

            return null;
        }
    } else {
        const result = await current.addSong(msg, video),
            resultMessage = {
                color: 0xcd6e57,
                author: {
                    name: `${msg.author.tag}`,
                    iconURL: msg.author.displayAvatarURL({ format: 'png' })
                },
                description: result
            };

        statusMsg.edit('', { embed: resultMessage });

        return null;
    }

}

const handlePlaylist = (current) => async (video, playlist, queue, voiceChannel, msg, statusMsg) => {
    if (moment.duration(video.raw.contentDetails.duration, moment.ISO_8601).asSeconds() === 0) {
        statusMsg.edit(`${msg.author}, il semblerai que cette playlist soit un live, or je ne peux pas jouer de live !`);

        return null;
    }
    const result = await current.addSong(msg, video),
        resultMessage = {
            color: 0xcd6e57,
            author: {
                name: `${msg.author.tag}`,
                iconURL: msg.author.displayAvatarURL({ format: 'png' })
            },
            description: result
        };

    if (!result.startsWith('👍')) {
        current.queue.delete(msg.guild.id);
        statusMsg.edit('', { embed: resultMessage });

        return null;
    }

    statusMsg.edit('', {
        embed: {
            color: 0xcd6e57,
            author: {
                name: `${msg.author.tag}`,
                icon_url: msg.author.displayAvatarURL({ format: 'png' })
            },
            description: `Ajout de la playlist [${playlist.title}](https://www.youtube.com/playlist?list=${playlist.id}) dans la file d'attente !\nAffichez la liste des musiques en attente avce: \`${msg.guild.commandPrefix}queue\`!`
        }
    });

    return null;
}

const addSong = (current) => (msg, video) => {
    const queue = current.queue.get(msg.guild.id)

    const song = new Song(video, msg.member);

    queue.songs.push(song);

    return `👍 ${`[${song}](${`${song.url}`})`}`;
}

const play = (current) => (guild, song) => {
    const queue = current.queue.get(guild.id);
    const vote = current.votes.get(guild.id);

    if (vote) {
        clearTimeout(vote);
        current.votes.delete(guild.id);
    }

    if (!song) {
        queue.textChannel.send('Il n\'y a plus de musique ! Ajoutez-en quelques-unes à la file d\'attente pour relancer la musique ! 🎶');
        queue.voiceChannel.leave();
        current.queue.delete(guild.id);
        return;
    }

    //mettre en place le système qui deco quand il y a plus personne

    let streamErrored = false;

    const playing = queue.textChannel.send({
        embed: {
            color: 0xcd6e57,
            author: {
                name: song.username,
                iconURL: song.avatar
            },
            description: `${`[${song}](${`${song.url}`})`}`,
            image: { url: song.thumbnail }
        }
    })

    const stream = ytdl(song.url, {
        quality: 'highestaudio',
        filter: 'audioonly',
        highWaterMark: 12
    })
    .on('error', () => {
        streamErrored = true;
        playing.then(msg => msg.edit(`❌ Impossible de jouer ${song}.`));
        queue.songs.shift();
        current.play(guild, queue.songs[0]);
    })

    const dispatcher = queue.connection.play(stream, {
        passes: 5,
        fec: true
    })
    .on('end', () => {
        if (streamErrored) return;

        if(!queue.loop) queue.songs.shift();

        current.play(guild, queue.songs[0])
    })
    .on('error', (err) => {
        queue.textChannel.send(`❌ Une erreur s'est produite lors de la lecture de la musique: \`${err}\``);
    });

    dispatcher.setVolumeLogarithmic(queue.volume / 5);
    song.dispatcher = dispatcher;
    song.playing = true;
    queue.playing = true;

    if (queue.voiceChannel.members.filter(member => !member.user.bot).array().length == 0) {
        queue.textChannel.send(`Il n\'y a plus personne ! Je perds mon temps... Je préfères partir :cry: !\nSi vous décidez de revenir faites simplement \`${guild.commandPrefix}resume\` !`);
        song.dispatcher.pause();
        song.playing = false;
        queue.timeLaps = setTimeout(()=> {
            queue.textChannel.send(`Cela fait maintenant 5 minutes que vous êtes partis ! Je me sent vraiment inutile !\n*Je vous quitte définitivement...*`);
            queue.voiceChannel.leave()
        },5*60*1000)
    }
}

const startReactEvent =  (msg,videos,sendedEmbed,current,queue,voiceChannel,statusMsg) => {
    return async (messageReaction,user) => {
        if(user.bot || sendedEmbed.id !== messageReaction.message.id || user.id !== msg.author.id) return;
        const emoji = messageReaction.emoji.name;
        if (emojis.includes(emoji)) {
            if(sendedEmbed) sendedEmbed.delete();
            msg.client.removeListener('messageReactionAdd', startReactEvent);
            if(emoji === '❌'){
                return null;
            }
            const video = await current.youtube.getVideoByID(videos[emojis.indexOf(emoji)].id);
            return current.handleVideo(video, queue, voiceChannel, msg, statusMsg);
        }
    }
}

module.exports = class PlaySongCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'play',
            memberName: 'play',
            group: 'musique',
            description: 'Permet de lancer une musique',
            aliases: ['lancer','musique','music','ytb'],
            examples: ['play {youtube video to play}'],
            guildOnly: true,
            args: [
                {
                    key: 'url',
                    prompt: 'Quelle musique voulez-vous écouter ?',
                    type: 'string',
                    parse: p => p.replace(/<(.+)>/g, '$1')
                }
            ]
        });

        this.queue = new Map();
        this.youtube = new YouTube(process.env.youtube_api);
    }

    run(...args) {
        return run(this)(...args).then(() => null)
    }

    handleVideo(...args) {
        return handleVideo(this)(...args)
    }

    handlePlaylist(...args) {
        return handlePlaylist(this)(...args)
    }

    addSong(...args) {
        return addSong(this)(...args)
    }

    play(...args) {
        return play(this)(...args)
    }

    get votes() {
        if (!this._votes) {
            this._votes = this.client.registry.resolveCommand('musique:skip').votes;
        }

        return this._votes;
    }
};