const {MessageEmbed} = require('discord.js'); 
const {Command} = require('discord.js-commando');
const {deleteCommandMessages} = require('../../utils.js');

module.exports = class SupportCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'support',
      memberName: 'support',
      group: 'bot',
      aliases: ['probleme', 'erreur','aide'],
      description: 'Recevoir une invitation pour rejoindre le support',
      examples: ['support'],
      guildOnly: false
    });
  }

  run (msg) {
    deleteCommandMessages(msg);
    const supportEmbed = new MessageEmbed()
      .setTitle('Support du DraftBot')
      .setThumbnail('https://www.draftman.fr/images/avatar.jpg')
      .setURL('https://discord.gg/G3Pc4Sa')
      .setColor(0xcd6e57)
      .setDescription("Il est tout à fait normal d'avoir un soucis, ça peut arriver à tout le monde et surtout lorsque vous n'êtes pas propriétaire du robot 😉 !\n\nVoici une invitation vers [mon support](https://discord.gg/G3Pc4Sa) !\n\nCordialement __**DraftBot**__\n\nPS: Je crois que DraftMan t'attends patiemment 😘");

    return msg.embed(supportEmbed);
  }
};