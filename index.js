require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildEmojisAndStickers
    ]
});

// Função para formatar emojis personalizados
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
        .setDescription('Criar Embed com Banner e Thumbnail')
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

            // 1. Título
            const tituloInput = new TextInputBuilder()
                .setCustomId('titulo')
                .setLabel("Título")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Ex: Novidades do Servidor')
                .setRequired(true);

            // 2. Descrição
            const descricaoInput = new TextInputBuilder()
                .setCustomId('descricao')
                .setLabel("Descrição")
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Ex: > :dinheiro: Valor: 10,00') 
                .setRequired(true);

            // 3. Cor
            const corInput = new TextInputBuilder()
                .setCustomId('cor')
                .setLabel("Cor Hex (Ex: #2b2d31)")
                .setStyle(TextInputStyle.Short)
                .setValue('#2b2d31')
                .setRequired(false);

            // 4. Thumbnail (Imagem Pequena) - NOVO
            const thumbnailInput = new TextInputBuilder()
                .setCustomId('thumbnail')
                .setLabel("Link da Miniatura/Logo (Opcional)")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('https://...')
                .setRequired(false);

            // 5. Banner (Imagem Grande) - RENOMEADO
            const bannerInput = new TextInputBuilder()
                .setCustomId('banner')
                .setLabel("Link do Banner/Imagem Grande (Opcional)")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('https://...')
                .setRequired(false);

            // Adicionando os componentes (Máximo de 5 ActionRows)
            modal.addComponents(
                new ActionRowBuilder().addComponents(tituloInput),
                new ActionRowBuilder().addComponents(descricaoInput),
                new ActionRowBuilder().addComponents(corInput),
                new ActionRowBuilder().addComponents(thumbnailInput),
                new ActionRowBuilder().addComponents(bannerInput)
            );

            await interaction.showModal(modal);
        }
    }

    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'modalMimu') {
            
            // Coletando os dados
            const titulo = interaction.fields.getTextInputValue('titulo');
            let descricao = interaction.fields.getTextInputValue('descricao');
            const cor = interaction.fields.getTextInputValue('cor');
            
            // Novos campos de imagem
            const thumbnail = interaction.fields.getTextInputValue('thumbnail');
            const banner = interaction.fields.getTextInputValue('banner');

            const tituloFinal = formatarTextoComEmojis(titulo, client);
            const descricaoFinal = formatarTextoComEmojis(descricao, client);

            const embed = new EmbedBuilder()
                .setTitle(tituloFinal)
                .setDescription(descricaoFinal)
                .setColor(cor)
                .setFooter({ text: `Enviado por ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            // Lógica para adicionar Thumbnail (Canto superior direito)
            if (thumbnail && thumbnail.startsWith('http')) {
                embed.setThumbnail(thumbnail);
            }

            // Lógica para adicionar Banner (Imagem grande embaixo)
            if (banner && banner.startsWith('http')) {
                embed.setImage(banner);
            }

            await interaction.reply({ content: '✅ Embed enviado com sucesso!', ephemeral: true });
            await interaction.channel.send({ embeds: [embed] });
        }
    }
});

client.login(process.env.TOKEN);