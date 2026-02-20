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
    ActionRowBuilder 
} = require('discord.js');

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
    // 1. Comando de Criar Embed (Com Upload de Arquivo)
    new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Cria um Embed. Use as opções para enviar imagens (Upload)')
        .addAttachmentOption(option => 
            option.setName('banner')
                .setDescription('Faça upload da imagem do Banner (Grande)')
                .setRequired(false))
        .addAttachmentOption(option => 
            option.setName('thumbnail')
                .setDescription('Faça upload da Logo/Thumbnail (Pequena)')
                .setRequired(false)),

    // 2. Comando de Editar Mídia (Via Link)
    new SlashCommandBuilder()
        .setName('editar_midia')
        .setDescription('Troca a imagem de um Embed já enviado usando o Link da Mensagem')
        .addStringOption(option => 
            option.setName('link')
                .setDescription('Link da mensagem do Embed (Clique direito -> Copiar Link)')
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
    await client.application.fetch(); 
    
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
    // Verificamos se é um comando de barra
    if (!interaction.isChatInputCommand()) return;

    // --- LÓGICA DO COMANDO /EMBED ---
    if (interaction.commandName === 'embed') {
        // 1. Captura os arquivos enviados no comando ANTES do modal
        const bannerFile = interaction.options.getAttachment('banner');
        const thumbFile = interaction.options.getAttachment('thumbnail');

        // 2. Configura o Modal para os textos
        const modal = new ModalBuilder()
            .setCustomId('modalEmbed')
            .setTitle('Configurar Textos');

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

        // 3. Mostra o Modal
        await interaction.showModal(modal);

        // 4. Aguarda o envio do Modal (Isso une o arquivo do comando com o texto do modal)
        const filter = (i) => i.customId === 'modalEmbed' && i.user.id === interaction.user.id;
        
        try {
            // Espera até 5 minutos pelo envio
            const submitted = await interaction.awaitModalSubmit({ filter, time: 300_000 });
            await submitted.deferReply({ ephemeral: false }); 

            // Dados do Modal
            const titulo = submitted.fields.getTextInputValue('titulo');
            const descricao = submitted.fields.getTextInputValue('descricao');
            const cor = submitted.fields.getTextInputValue('cor') || '#2b2d31';

            // Formata Emojis
            const tituloFinal = formatarTextoComEmojis(titulo, client);
            const descricaoFinal = formatarTextoComEmojis(descricao, client);

            const embed = new EmbedBuilder()
                .setTitle(tituloFinal)
                .setDescription(descricaoFinal)
                .setColor(cor)
                .setFooter({ text: `Enviado por ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            // ARRAY DE ARQUIVOS PARA ENVIAR
            const filesToSend = [];

            // Se o usuário upou um Banner
            if (bannerFile) {
                filesToSend.push(bannerFile);
                embed.setImage(`attachment://${bannerFile.name}`);
            }

            // Se o usuário upou uma Thumbnail
            if (thumbFile) {
                filesToSend.push(thumbFile);
                embed.setThumbnail(`attachment://${thumbFile.name}`);
            }

            // Envia a resposta final
            await submitted.editReply({ 
                content: '✅ Embed criado com sucesso!',
                embeds: [embed], 
                files: filesToSend 
            });

        } catch (error) {
            if (error.code !== 'InteractionCollectorError') {
                console.error(error);
            }
        }
    }

    // --- LÓGICA DO COMANDO /EDITAR_MIDIA ---
    if (interaction.commandName === 'editar_midia') {
        await interaction.deferReply({ ephemeral: true });

        const link = interaction.options.getString('link');
        const novoBanner = interaction.options.getAttachment('novo_banner');
        const novaThumbnail = interaction.options.getAttachment('nova_thumbnail');

        // Regex para extrair IDs do link: https://discord.com/channels/GUILD/CHANNEL/MESSAGE
        const regex = /channels\/(\d+)\/(\d+)\/(\d+)/;
        const match = link.match(regex);

        if (!match) {
            return interaction.editReply('❌ Link inválido! Copie o "Link da Mensagem" corretamente.');
        }

        const [_, guildId, channelId, messageId] = match;

        try {
            const canal = await client.channels.fetch(channelId);
            if (!canal) return interaction.editReply('❌ Canal não encontrado.');

            const mensagemAlvo = await canal.messages.fetch(messageId);
            if (!mensagemAlvo) return interaction.editReply('❌ Mensagem não encontrada.');

            // Verifica se a mensagem é do bot
            if (mensagemAlvo.author.id !== client.user.id) {
                return interaction.editReply('❌ Só posso editar mensagens enviadas por mim.');
            }

            if (mensagemAlvo.embeds.length === 0) {
                return interaction.editReply('❌ Essa mensagem não tem Embed.');
            }

            // Clona o Embed existente para manter o texto
            const novoEmbed = EmbedBuilder.from(mensagemAlvo.embeds[0]);
            const arquivosParaEnviar = [];

            // Atualiza Banner se foi enviado
            if (novoBanner) {
                arquivosParaEnviar.push(novoBanner);
                novoEmbed.setImage(`attachment://${novoBanner.name}`);
            }

            // Atualiza Thumbnail se foi enviada
            if (novaThumbnail) {
                arquivosParaEnviar.push(novaThumbnail);
                novoEmbed.setThumbnail(`attachment://${novaThumbnail.name}`);
            }

            if (arquivosParaEnviar.length === 0) {
                return interaction.editReply('⚠️ Você precisa enviar pelo menos uma imagem nova.');
            }

            // Edita a mensagem trocando os arquivos
            await mensagemAlvo.edit({ 
                embeds: [novoEmbed], 
                files: arquivosParaEnviar 
            });

            await interaction.editReply(`✅ Mídia atualizada com sucesso! [Ir para mensagem](${link})`);

        } catch (erro) {
            console.error(erro);
            await interaction.editReply('❌ Erro ao editar. Verifique minhas permissões no canal.');
        }
    }
});

client.login(process.env.TOKEN);
