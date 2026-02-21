require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    REST, 
    Routes, 
    SlashCommandBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle 
} = require('discord.js'); // Adicionado ButtonBuilder e ButtonStyle

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildEmojisAndStickers
    ]
});

// --- FUNÇÕES AUXILIARES ---

function formatarTextoComEmojis(texto, client) {
    if (!texto) return texto;
    const regex = /(?<!<a?):(\w+):(?!\d+>)/g;
    return texto.replace(regex, (match, nomeEmoji) => {
        const emoji = client.emojis.cache.find(e => e.name.toLowerCase() === nomeEmoji.toLowerCase());
        return emoji ? emoji.toString() : match;
    });
}

// --- CONFIGURAÇÃO DOS COMANDOS ---
const commands = [
    // 1. Comando de Criar Embed
    new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Cria um Embed e envia no canal.')
        // Opções de Imagem
        .addAttachmentOption(option => 
            option.setName('banner')
                .setDescription('Imagem do Banner (Grande)')
                .setRequired(false))
        .addAttachmentOption(option => 
            option.setName('thumbnail')
                .setDescription('Imagem da Logo/Thumbnail (Pequena)')
                .setRequired(false))
        // Opções do Botão
        .addStringOption(option =>
            option.setName('botao_texto')
                .setDescription('Texto que vai no botão (Ex: Clique Aqui)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('botao_url')
                .setDescription('Link para onde o botão vai levar (https://...)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('botao_emoji')
                .setDescription('Emoji do botão (Cole o emoji aqui ou use o ID)')
                .setRequired(false)),

    // 2. Comando de Editar Mídia (Mantido igual)
    new SlashCommandBuilder()
        .setName('editar_midia')
        .setDescription('Troca a imagem de um Embed já enviado pelo Bot')
        .addStringOption(option => 
            option.setName('link')
                .setDescription('Link da mensagem do Embed')
                .setRequired(true))
        .addAttachmentOption(option => 
            option.setName('novo_banner')
                .setDescription('Nova imagem de Banner')
                .setRequired(false))
        .addAttachmentOption(option => 
            option.setName('nova_thumbnail')
                .setDescription('Nova imagem de Logo')
                .setRequired(false))
]
.map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

client.once('ready', async () => {
    console.log(`✅ Bot logado como ${client.user.tag}!`);
    try {
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );
        console.log('✅ Comandos registrados com sucesso!');
    } catch (error) {
        console.error(error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // --- LÓGICA DO COMANDO /EMBED ---
    if (interaction.commandName === 'embed') {
        // 1. Captura opções do Slash Command (Imagens e Botão)
        const bannerFile = interaction.options.getAttachment('banner');
        const thumbFile = interaction.options.getAttachment('thumbnail');
        
        const btnTexto = interaction.options.getString('botao_texto');
        const btnUrl = interaction.options.getString('botao_url');
        const btnEmoji = interaction.options.getString('botao_emoji');

        // 2. Configura o Modal para Título e Descrição
        const modal = new ModalBuilder()
            .setCustomId('modalEmbed')
            .setTitle('Criar Embed');

        const tituloInput = new TextInputBuilder()
            .setCustomId('titulo')
            .setLabel("Título")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const descricaoInput = new TextInputBuilder()
            .setCustomId('descricao')
            .setLabel("Descrição")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const corInput = new TextInputBuilder()
            .setCustomId('cor')
            .setLabel("Cor Hex (Ex: #2b2d31)")
            .setStyle(TextInputStyle.Short)
            .setValue('#2b2d31')
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(tituloInput),
            new ActionRowBuilder().addComponents(descricaoInput),
            new ActionRowBuilder().addComponents(corInput)
        );

        await interaction.showModal(modal);

        const filter = (i) => i.customId === 'modalEmbed' && i.user.id === interaction.user.id;
        
        try {
            const submitted = await interaction.awaitModalSubmit({ filter, time: 300_000 });
            await submitted.deferReply({ ephemeral: true }); 

            // Dados do Modal
            const titulo = submitted.fields.getTextInputValue('titulo');
            const descricao = submitted.fields.getTextInputValue('descricao');
            const cor = submitted.fields.getTextInputValue('cor') || '#2b2d31';

            const tituloFinal = formatarTextoComEmojis(titulo, client);
            const descricaoFinal = formatarTextoComEmojis(descricao, client);

            const embed = new EmbedBuilder()
                .setTitle(tituloFinal)
                .setDescription(descricaoFinal)
                .setColor(cor)
                .setTimestamp();

            // Configuração das Imagens
            const filesToSend = [];

            if (bannerFile) {
                filesToSend.push(bannerFile);
                embed.setImage(`attachment://${bannerFile.name}`);
            }

            if (thumbFile) {
                filesToSend.push(thumbFile);
                embed.setThumbnail(`attachment://${thumbFile.name}`);
            }

            // --- CONFIGURAÇÃO DO BOTÃO ---
            const components = [];

            // Só cria o botão se tiver Texto E Link
            if (btnTexto && btnUrl) {
                // Validação básica de URL (começar com http)
                if (!btnUrl.startsWith('http')) {
                    return submitted.editReply({ content: '❌ O link do botão precisa começar com `http://` ou `https://`.' });
                }

                const button = new ButtonBuilder()
                    .setLabel(btnTexto)
                    .setURL(btnUrl)
                    .setStyle(ButtonStyle.Link);

                if (btnEmoji) {
                    button.setEmoji(btnEmoji);
                }

                const row = new ActionRowBuilder().addComponents(button);
                components.push(row);
            }

            // Envia no CANAL
            await interaction.channel.send({ 
                embeds: [embed], 
                files: filesToSend,
                components: components // Adiciona o botão aqui
            });

            await submitted.editReply({ content: '✅ Embed enviada no canal com sucesso!' });

        } catch (error) {
            if (error.code !== 'InteractionCollectorError') {
                console.error(error);
                try {
                     if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({ content: '❌ Ocorreu um erro ao criar a embed.', ephemeral: true });
                     }
                } catch (e) {}
            }
        }
    }

    // --- LÓGICA DO COMANDO /EDITAR_MIDIA (Igual ao anterior) ---
    if (interaction.commandName === 'editar_midia') {
        await interaction.deferReply({ ephemeral: true });

        const link = interaction.options.getString('link');
        const novoBanner = interaction.options.getAttachment('novo_banner');
        const novaThumbnail = interaction.options.getAttachment('nova_thumbnail');

        const regex = /channels\/(\d+)\/(\d+)\/(\d+)/;
        const match = link.match(regex);

        if (!match) return interaction.editReply('❌ Link inválido!');

        const [_, guildId, channelId, messageId] = match;

        try {
            const canal = await client.channels.fetch(channelId);
            if (!canal) return interaction.editReply('❌ Canal não encontrado.');

            const mensagemAlvo = await canal.messages.fetch(messageId);
            if (!mensagemAlvo) return interaction.editReply('❌ Mensagem não encontrada.');

            if (mensagemAlvo.author.id !== client.user.id) return interaction.editReply('❌ Só posso editar mensagens minhas.');

            const novoEmbed = EmbedBuilder.from(mensagemAlvo.embeds[0]);
            const arquivosParaEnviar = [];

            if (novoBanner) {
                arquivosParaEnviar.push(novoBanner);
                novoEmbed.setImage(`attachment://${novoBanner.name}`);
            }
            if (novaThumbnail) {
                arquivosParaEnviar.push(novaThumbnail);
                novoEmbed.setThumbnail(`attachment://${novaThumbnail.name}`);
            }

            if (arquivosParaEnviar.length === 0) return interaction.editReply('⚠️ Nenhuma imagem nova anexada.');

            await mensagemAlvo.edit({ 
                embeds: [novoEmbed], 
                files: arquivosParaEnviar 
            });

            await interaction.editReply(`✅ Atualizado! [Ver mensagem](${link})`);

        } catch (erro) {
            console.error(erro);
            await interaction.editReply('❌ Erro ao editar.');
        }
    }
});

client.login(process.env.TOKEN);