require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildEmojisAndStickers
    ]
});

function formatarTextoComEmojis(texto, client) {
    if (!texto) return texto;

    const regex = /(?<!<a?):(\w+):(?!\d+>)/g;

    return texto.replace(regex, (match, nomeEmoji) => {
        const emoji = client.emojis.cache.find(e => e.name.toLowerCase() === nomeEmoji.toLowerCase());
        
        return emoji ? emoji.toString() : match;
    });
}

const commands = [
    new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Criar Embed')
]
.map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

client.once('ready', async () => {
    console.log(`✅ Bot logado como ${client.user.tag}!`);
    await client.application.fetch(); 
    console.log(`🔎 Carregados ${client.emojis.cache.size} emojis.`);
    
    try {
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );
        console.log('✅ Comandos prontos!');
    } catch (error) {
        console.error(error);
    }
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'embed') {
            const modal = new ModalBuilder()
                .setCustomId('modalMimu')
                .setTitle('Criar Anúncio');

            const tituloInput = new TextInputBuilder()
                .setCustomId('titulo')
                .setLabel("Título")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Ex: Tabela de Preços')
                .setRequired(true);

            const descricaoInput = new TextInputBuilder()
                .setCustomId('descricao')
                .setLabel("Descrição")
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Ex: > :dinheiro: Valor: 10,00') 
                .setRequired(true);

            const corInput = new TextInputBuilder()
                .setCustomId('cor')
                .setLabel("Cor Hex (Ex: #2b2d31)")
                .setStyle(TextInputStyle.Short)
                .setValue('#2b2d31')
                .setRequired(false);

            const imagemInput = new TextInputBuilder()
                .setCustomId('imagem')
                .setLabel("Link da Imagem (Opcional)")
                .setStyle(TextInputStyle.Short)
                .setRequired(false);

            modal.addComponents(
                new ActionRowBuilder().addComponents(tituloInput),
                new ActionRowBuilder().addComponents(descricaoInput),
                new ActionRowBuilder().addComponents(corInput),
                new ActionRowBuilder().addComponents(imagemInput)
            );

            await interaction.showModal(modal);
        }
    }

    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'modalMimu') {
            
            const titulo = interaction.fields.getTextInputValue('titulo');
            let descricao = interaction.fields.getTextInputValue('descricao');
            const cor = interaction.fields.getTextInputValue('cor');
            const imagem = interaction.fields.getTextInputValue('imagem');

            const tituloFinal = formatarTextoComEmojis(titulo, client);
            const descricaoFinal = formatarTextoComEmojis(descricao, client);

            const embed = new EmbedBuilder()
                .setTitle(tituloFinal)
                .setDescription(descricaoFinal)
                .setColor(cor)
                .setFooter({ text: `Enviado por ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            if (imagem && imagem.startsWith('http')) {
                embed.setImage(imagem);
            }

            await interaction.reply({ content: '✅ Embed enviado!', ephemeral: true });
            await interaction.channel.send({ embeds: [embed] });
        }
    }
});

client.login(process.env.TOKEN);