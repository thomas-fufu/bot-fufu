const { Command } = require('discord.js-commando')
const { MessageEmbed } = require('discord.js')
const { error,deleteCommandMessages } = require('../../utils.js');

module.exports = class InviteCommandCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'getinvite',
			group: 'utils',
			memberName: 'getinvite',
			description: 'Récupérer l\'invitation d\'un serveur à partir de son nom.',
			ownerOnly: true,
			args: [{
				key: 'guild',
				prompt: 'Quelle guilde vous interesse?',
				type: 'string'
			}]
		});
	}

	run(msg, { guild }) {
		deleteCommandMessages(msg);
		const newGuild = this.client.guilds.find(g => g.name.toLowerCase().includes(guild.toLowerCase()))

		if(!newGuild) return msg.reply('impossible de trouver une guild ayant ce nom !')
		
		newGuild.fetchInvites()
		.then(invites => {
			if(!invites) return msg.reply('il n\'y a aucune invitation valide sur ce serveur !')
			const embed = new MessageEmbed()
			.setTitle(newGuild.name)
			.setThumbnail(newGuild.iconURL({format: 'png'}))
			.setColor(0xcd6e57)
			.setDescription(`Voici une invitation pour rejoindre **${newGuild.name}**\n${invites.map(invite => invite.url).join('\n')}`)
			.setTimestamp()

			msg.embed(embed)
		}).catch(err => {
			if(err.message === "Missing Permissions"){
				msg.say(error(`Impossible d'obtenir l'invitation de \`${newGuild.name}\` car je n'ai pas la permission de gérer les invitations !`))
			}
		})
	}
};
