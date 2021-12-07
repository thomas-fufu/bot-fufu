const { Command } = require('discord.js-commando');
const { stripIndents } = require('common-tags');
const { error ,deleteCommandMessages } = require('../../utils.js');

module.exports = class HelpCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'help',
			group: 'bot',
			memberName: 'help',
			aliases: ['commands','commandes'],
			description: 'Afficher la liste des différentes commandes ou les details à propos d\'une commande en particulier.',
			examples: ['help', 'help quote'],
			guarded: true,
			args: [
				{
					key: 'command',
					prompt: 'Pour quelle commande voulez-vous de l\'aide',
					type: 'string',
					default: ''
				}
			]
		});
	}

	async run(msg, args) {
		deleteCommandMessages(msg);
		const groups = this.client.registry.groups;
		const commands = this.client.registry.findCommands(args.command, false, msg);
		const showAll = args.command && args.command.toLowerCase() === 'all';
		if(args.command && !showAll) {
			if(commands.length === 1) {
				let help = {
					embed: {
						title: `Commande ${commands[0].name}`,
						description: stripIndents`
							${commands[0].description}
							${commands[0].guildOnly ? ' (Utilisable uniquement sur un serveur)' : ''}
							${commands[0].nsfw ? ' (NSFW)' : ''}
						`,
						fields: [{
							name: "Format",
							value: msg.anyUsage(`${commands[0].name}${commands[0].format ? ` ${commands[0].format}` : ''}`)
						}],
						color: 0xcd6e57,
						
					}
				}

				if(commands[0].aliases.length > 0) help.embed.fields.push({name: "Alias",value: commands[0].aliases.join(', ')})
				help.embed.fields.push({name: "Groupe",value: commands[0].group.name})
				if(commands[0].details) help.embed.fields.push({name: "Details",value:commands[0].details});
				if(commands[0].examples) help.embed.fields.push({name: "Examples",value:commands[0].examples.join('\n')});

				const messages = [];
				try {
					if(msg.channel.type !== 'dm'){
						messages.push(msg.say(help));
					}else{
						messages.push(msg.reply('Je viens de vous envoyer la liste des commandes en MP !'));
						messages.push(msg.direct(help));
					}
				} catch(err) {
					messages.push(await msg.reply(error('Impossible de vous envoyer un message privé, il semblerait que vous ayez désactivé leur récéption.')));
				}
				return messages;
			} else if(commands.length > 15) {
				return msg.reply(':thinking: | Plusieurs commandes ont été trouvées. S\'il vous plaît veuillez être plus précis.');
			} else if(commands.length > 1) {
				const list = commands.map(item => `"${(property ? item[property] : item).replace(/ /g, '\xa0')}"`).join(',   ');
				return msg.reply(`:thinking: | Plusieurs commandes ont été trouvées. S\'il vous plaît veuillez être plus précis: ${list}`);
			} else {
				return msg.reply(error(
					`Impossible d'identifier la commande. Veuillez utiliser ${msg.usage(
						null, msg.channel.type === 'dm' ? null : undefined, msg.channel.type === 'dm' ? null : undefined
					)} pour voir la liste de toutes les commandes.`)
				);
			}
		} else {
			const messages = [];

			try {
				const embed = {
					embed: {
						title: "Help - Voici la liste des commandes",
						color: 0xcd6e57,
						description: stripIndents`
							Pour executer une commande sur  ${msg.guild ? msg.guild.name : 'n\'importe quel serveur'}
							veuillez utiliser ${Command.usage('command', msg.guild ? msg.guild.commandPrefix : null, this.client.user)}.

							Par exemple, ${Command.usage('quote', msg.guild ? msg.guild.commandPrefix : null, this.client.user)}.

							Utilisez ${this.usage('<commande>', null, null)} pour voir les détails d\'une commande.
							Utilisez ${this.usage('all', null, null)} pour voir la liste de **toutes** les commandes disponibles.
						`,
						fields: []
					}
				};
				
				(showAll ? groups : groups.filter(grp => grp.commands.some(cmd => cmd.isUsable(msg))))
				.map(grp => embed.embed.fields.push({
					name: grp.name,
					value: `${(showAll ? grp.commands : grp.commands.filter(cmd => cmd.isUsable(msg)))
						.map(cmd => `__${cmd.name}:__ ${cmd.description}${cmd.nsfw ? ' (NSFW)' : ''}`).join('\n')
						}`
				}));
				messages.push(await msg.direct('', embed));

				if(msg.channel.type !== 'dm') messages.push(await msg.reply('📰 | Je vous ai envoyé la liste des commandes en MP !'));
			} catch(err) {
				
				if(err.message === 'Cannot send messages to this user'){
					messages.push(await msg.reply(error('Impossible de vous envoyer un message privé, il semblerait que vous ayez désactivé leur récéption.')));
				}else{
					console.log('Help error',err)
				}
			}
			return messages;
		}
	}
};
