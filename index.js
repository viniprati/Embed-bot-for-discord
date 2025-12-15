// 1. Carrega as variáveis do arquivo .env IMEDIATAMENTE
require('dotenv').config(); 

const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder } = require('discord.js');

if (!process.env.TOKEN || !process.env.CLIENT_ID) {
    console.error("Erro: TOKEN ou CLIENT_ID não foram encontrados no arquivo .env");
    process.exit(1);
}

// 2. Configuração do Cliente
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// 3. Definindo o comando /anuncio
const commands = [
    new SlashCommandBuilder()
        .setName('anuncio')
        .setDescription('Cria um embed personalizado')
        .addStringOption(option =>
            option.setName('titulo')
                .setDescription('O título do embed')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('descricao')
                .setDescription('A mensagem principal do embed')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('cor')
                .setDescription('Cor em Hex (ex: #FF0000) ou nome (Red, Blue)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('imagem')
                .setDescription('URL de uma imagem ou GIF')
                .setRequired(false))
]
.map(command => command.toJSON());

// 4. Registrando o comando usando as variáveis do .env
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

client.once('ready', async () => {
    console.log(`Bot logado como ${client.user.tag}!`);

    try {
        console.log('Atualizando comandos de barra (/).');
        
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log('Comandos registrados com sucesso!');
    } catch (error) {
        console.error(error);
    }
});

// 5. Respondendo ao comando
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'anuncio') {
        const titulo = interaction.options.getString('titulo');
        const descricao = interaction.options.getString('descricao').replace(/\\n/g, '\n'); 
        const cor = interaction.options.getString('cor') || '#0099ff';
        const imagem = interaction.options.getString('imagem');

        try {
            const embed = new EmbedBuilder()
                .setTitle(titulo)
                .setDescription(descricao)
                .setColor(cor)
                .setFooter({ text: `Enviado por ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            if (imagem) {
                if (imagem.startsWith('http')) {
                    embed.setImage(imagem);
                }
            }

            await interaction.reply({ embeds: [embed] });

        } catch (err) {
            console.error(err);
            await interaction.reply({ content: 'Houve um erro ao criar o embed. Verifique se a cor ou a imagem são válidas.', ephemeral: true });
        }
    }
});

// 6. Ligar o Bot usando o token do .env
client.login(process.env.TOKEN);