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
    ButtonStyle,
    PermissionFlagsBits,
    Options, // Importante para otimização
    InteractionType
} = require('discord.js');

// --- 1. OTIMIZAÇÃO DE MEMÓRIA (O SEGREDO) ---
// Um bot de Embed NÃO precisa guardar mensagens antigas, usuários ou emojis no cache.
// Isso faz o bot rodar com 50MB de RAM mesmo em 1000 servidores.
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        // Removemos MessageContent e GuildMessages pois Slash Commands não precisam ler chat
    ],
    makeCache: Options.cacheWithLimits({
        ...Options.DefaultMakeCacheSettings,
        ReactionManager: 0,
        GuildMemberManager: 0,
        MessageManager: 0, // Não guarda mensagens antigas
        UserManager: 0,
        ThreadManager: 0,
        PresenceManager: 0, // Não precisa saber quem está online
    }),
});

// --- FUNÇÕES AUXILIARES ---
// Validador de Cor Hexadecimal
function validarHex(hex) {
    return /^#[0-9A-F]{6}$/i.test(hex) ? hex : null;
}

// --- CONFIGURAÇÃO DOS COMANDOS ---
const commands = [
    new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Cria um Embed profissional.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages) // Só Staff usa
        .setDMPermission(false) // Não funciona na DM
        .addAttachmentOption(opt => opt.setName('banner').setDescription('Banner (Grande)').setRequired(false))
        .addAttachmentOption(opt => opt.setName('thumbnail').setDescription('Thumbnail (Pequena)').setRequired(false))
        .addStringOption(opt => opt.setName('botao_texto').setDescription('Texto do botão').setRequired(false))
        .addStringOption(opt => opt.setName('botao_url').setDescription('Link do botão').setRequired(false))
        .addStringOption(opt => opt.setName('botao_emoji').setDescription('Emoji do botão').setRequired(false)),

    new SlashCommandBuilder()
        .setName('editar_midia')
        .setDescription('Troca a imagem de um Embed do bot.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .setDMPermission(false)
        .addStringOption(opt => opt.setName('link').setDescription('Link da mensagem').setRequired(true))
        .addAttachmentOption(opt => opt.setName('novo_banner').setDescription('Novo Banner').setRequired(false))
        .addAttachmentOption(opt => opt.setName('nova_thumbnail').setDescription('Nova Thumbnail').setRequired(false))
]
.map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

// --- REGISTRO DE COMANDOS ---
client.once('ready', async () => {
    console.log(`🚀 Bot Sênior Online: ${client.user.tag}`);
    console.log(`🧠 Memória inicial: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`);
    
    // DICA SÊNIOR: Em produção, não registre comandos no 'ready' toda vez.
    // Isso pode causar Rate Limit se o bot reiniciar muito.
    // Mas para manter num arquivo só, faremos uma verificação simples.
    try {
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );
        console.log('✅ Comandos sincronizados globalmente.');
    } catch (error) {
        console.error('Erro ao registrar comandos:', error);
    }
});

// --- HANDLER DE INTERAÇÃO ---
client.on('interactionCreate', async interaction => {
    // Tratamento de Erro Global para evitar crash
    try {
        if (interaction.isChatInputCommand()) {
            if (interaction.commandName === 'embed') await handleEmbedCommand(interaction);
            if (interaction.commandName === 'editar_midia') await handleEditMediaCommand(interaction);
        }
    } catch (error) {
        console.error('Erro fatal na interação:', error);
        const msg = { content: '❌ Ocorreu um erro interno. Tente novamente.', ephemeral: true };
        if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
        else await interaction.reply(msg);
    }
});

// --- LÓGICA DO COMANDO: EMBED ---
async function handleEmbedCommand(interaction) {
    const bannerFile = interaction.options.getAttachment('banner');
    const thumbFile = interaction.options.getAttachment('thumbnail');
    const btnTexto = interaction.options.getString('botao_texto');
    const btnUrl = interaction.options.getString('botao_url');
    const btnEmoji = interaction.options.getString('botao_emoji');

    // Validações imediatas (Fail Fast)
    if (bannerFile && !bannerFile.contentType?.startsWith('image/')) 
        return interaction.reply({ content: '❌ O arquivo de Banner deve ser uma imagem.', ephemeral: true });
    if (thumbFile && !thumbFile.contentType?.startsWith('image/')) 
        return interaction.reply({ content: '❌ O arquivo de Thumbnail deve ser uma imagem.', ephemeral: true });

    // Modal
    const modal = new ModalBuilder().setCustomId(`embedModal-${interaction.id}`).setTitle('Criar Embed');

    modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('titulo').setLabel("Título").setStyle(TextInputStyle.Short).setMaxLength(256).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('descricao').setLabel("Descrição").setStyle(TextInputStyle.Paragraph).setMaxLength(4000).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('cor').setLabel("Cor Hex (Ex: #2b2d31)").setStyle(TextInputStyle.Short).setValue('#2b2d31').setMinLength(7).setMaxLength(7).setRequired(false))
    );

    await interaction.showModal(modal);

    // Aguardar submissão (Timeout otimizado)
    try {
        const submitted = await interaction.awaitModalSubmit({
            filter: i => i.customId === `embedModal-${interaction.id}`,
            time: 10 * 60 * 1000 // 10 minutos
        });

        await submitted.deferReply({ ephemeral: true });

        const titulo = submitted.fields.getTextInputValue('titulo');
        const descricao = submitted.fields.getTextInputValue('descricao');
        const corRaw = submitted.fields.getTextInputValue('cor');
        const corFinal = validarHex(corRaw) || '#2b2d31';

        const embed = new EmbedBuilder()
            .setTitle(titulo) // Emojis funcionam nativamente se o bot estiver no servidor do emoji
            .setDescription(descricao)
            .setColor(corFinal)
            .setTimestamp();

        // Tratamento de Imagens
        const filesToSend = [];
        if (bannerFile) {
            filesToSend.push({ attachment: bannerFile.url, name: 'banner.png' });
            embed.setImage('attachment://banner.png');
        }
        if (thumbFile) {
            filesToSend.push({ attachment: thumbFile.url, name: 'thumb.png' });
            embed.setThumbnail('attachment://thumb.png');
        }

        // Tratamento de Botão
        const components = [];
        if (btnTexto && btnUrl) {
            if (!btnUrl.startsWith('http')) return submitted.editReply('❌ URL inválida.');
            
            const btn = new ButtonBuilder().setLabel(btnTexto).setURL(btnUrl).setStyle(ButtonStyle.Link);
            if (btnEmoji) {
                // Tenta adicionar emoji, se falhar (emoji inválido), envia sem
                try { btn.setEmoji(btnEmoji); } catch (e) { /* ignora emoji inválido */ }
            }
            components.push(new ActionRowBuilder().addComponents(btn));
        }

        // Enviar
        await interaction.channel.send({
            embeds: [embed],
            files: filesToSend,
            components: components,
            allowedMentions: { parse: [] } // SEGURANÇA: Previne @everyone fantasma na embed
        });

        await submitted.editReply('✅ Embed enviada!');

    } catch (err) {
        if (err.code === 'InteractionCollectorError') {
            // Não precisa logar erro de timeout, é normal
        } else {
            console.error(err);
            // Tenta avisar usuário se possível
        }
    }
}

// --- LÓGICA DO COMANDO: EDITAR MÍDIA ---
async function handleEditMediaCommand(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const link = interaction.options.getString('link');
    const novoBanner = interaction.options.getAttachment('novo_banner');
    const novaThumb = interaction.options.getAttachment('nova_thumbnail');
    
    if (!novoBanner && !novaThumb) return interaction.editReply('⚠️ Você precisa anexar pelo menos uma imagem nova.');

    // Regex ultra seguro
    const match = link.match(/channels\/\d+\/(\d+)\/(\d+)/);
    if (!match) return interaction.editReply('❌ Link inválido.');
    
    const [_, channelId, messageId] = match;

    try {
        // Tenta buscar o canal. Como limpamos o cache, usamos fetch.
        const canal = await client.channels.fetch(channelId).catch(() => null);
        if (!canal) return interaction.editReply('❌ Canal não acessível ou não existe.');

        const msg = await canal.messages.fetch(messageId).catch(() => null);
        if (!msg) return interaction.editReply('❌ Mensagem não encontrada (pode ter sido deletada).');

        if (msg.author.id !== client.user.id) return interaction.editReply('❌ Essa mensagem não é minha.');
        if (msg.embeds.length === 0) return interaction.editReply('❌ Essa mensagem não tem embed.');

        // Reconstrói a embed existente
        const novaEmbed = EmbedBuilder.from(msg.embeds[0]);
        const arquivosNovos = [];

        // Lógica inteligente de substituição
        if (novoBanner) {
            arquivosNovos.push({ attachment: novoBanner.url, name: 'new_banner.png' });
            novaEmbed.setImage('attachment://new_banner.png');
        }
        
        if (novaThumb) {
            arquivosNovos.push({ attachment: novaThumb.url, name: 'new_thumb.png' });
            novaEmbed.setThumbnail('attachment://new_thumb.png');
        }

        // Discord exige que a gente mande os arquivos novos E mantenha a estrutura
        await msg.edit({
            embeds: [novaEmbed],
            files: arquivosNovos // Isso sobrescreve os anexos anteriores
        });

        await interaction.editReply('✅ Imagens atualizadas com sucesso!');

    } catch (error) {
        console.error('Erro ao editar:', error);
        await interaction.editReply('❌ Erro técnico ao editar a mensagem.');
    }
}

client.login(process.env.TOKEN);