require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const {
    prepararConexion,
    agregarCancion,
    pausar,
    reanudar,
    saltar,
    detener,
    limpiar,
    mezclar,
    obtenerEstado,
    cambiarRepeticion
} = require("./musica");

const { buscarYouTube } = require("./youtube");
const { obtenerSpotify } = require("./spotify");

const cliente = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ]
});

/* =========================
   COMANDOS
========================= */

const comandos = [

    new SlashCommandBuilder()
        .setName("reproducir")
        .setDescription("Reproduce una canción de YouTube o Spotify")
        .addStringOption(opcion =>
            opcion
                .setName("nombre_o_enlace")
                .setDescription("Nombre o enlace de la canción")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("pausar")
        .setDescription("Pausa la música"),

    new SlashCommandBuilder()
        .setName("reanudar")
        .setDescription("Reanuda la música"),

    new SlashCommandBuilder()
        .setName("saltar")
        .setDescription("Salta la canción actual"),

    new SlashCommandBuilder()
        .setName("detener")
        .setDescription("Detiene la música y limpia la cola"),

    new SlashCommandBuilder()
        .setName("salir")
        .setDescription("Milo sale del canal de voz"),

    new SlashCommandBuilder()
        .setName("cola")
        .setDescription("Muestra la cola de canciones"),

    new SlashCommandBuilder()
        .setName("limpiar")
        .setDescription("Limpia la cola"),

    new SlashCommandBuilder()
        .setName("mezclar")
        .setDescription("Mezcla la cola"),

    new SlashCommandBuilder()
        .setName("repetir")
        .setDescription("Cambia el modo de repetición"),

    new SlashCommandBuilder()
        .setName("actual")
        .setDescription("Muestra la canción actual"),

    new SlashCommandBuilder()
        .setName("ayuda")
        .setDescription("Muestra la ayuda de Milo Music"),

    new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Muestra la latencia de Milo Music"),

    new SlashCommandBuilder()
        .setName("idioma")
        .setDescription("Configura el idioma del bot")

].map(comando => comando.toJSON());

/* =========================
   REGISTRAR COMANDOS
========================= */

const rest = new REST({
    version: "10"
}).setToken(process.env.DISCORD_TOKEN);

async function registrarComandos() {

    try {

        console.log("🔄 Registrando comandos...");

        await rest.put(
            Routes.applicationCommands(
                cliente.user.id
            ),
            {
                body: comandos
            }
        );

        console.log("✅ Comandos registrados.");

    } catch (error) {

        console.error(
            "❌ Error registrando comandos:",
            error
        );

    }
}

/* =========================
   BOT LISTO
========================= */

cliente.once("ready", async () => {

    console.log("================================");
    console.log("🎵 MILO MUSIC");
    console.log("================================");

    console.log(`🤖 Usuario: ${cliente.user.tag}`);
    console.log(`🌐 Servidores: ${cliente.guilds.cache.size}`);

    cliente.user.setPresence({
        status: "dnd",
        activities: [
            {
                name: "🎵 música | /ayuda",
                type: 2
            }
        ]
    });

    await registrarComandos();

});

/* =========================
   INTERACCIONES
========================= */

cliente.on(
    "interactionCreate",
    async interaction => {

        if (!interaction.isChatInputCommand()) {
            return;
        }

        const comando = interaction.commandName;

        /* =========================
           REPRODUCIR
        ========================= */

        if (comando === "reproducir") {

            const entrada =
                interaction.options.getString(
                    "nombre_o_enlace"
                );

            const canal =
                interaction.member.voice.channel;

            if (!canal) {

                return interaction.reply({
                    content:
                        "❌ Debes entrar primero a un canal de voz.",
                    ephemeral: true
                });

            }

            await interaction.deferReply();

            try {

                let cancion;

                /* =========================
                   SPOTIFY
                ========================= */

                if (
                    entrada.includes(
                        "open.spotify.com"
                    )
                ) {

                    const spotify =
                        await obtenerSpotify(
                            entrada
                        );

                    if (!spotify) {

                        return interaction.editReply(
                            "❌ No pude obtener la información de Spotify."
                        );

                    }

                    if (
                        spotify.tipo ===
                        "cancion"
                    ) {

                        const busqueda =
                            `${spotify.titulo} ${spotify.artista}`;

                        cancion =
                            await buscarYouTube(
                                busqueda
                            );

                    } else {

                        return interaction.editReply(
                            "📀 Las playlists de Spotify se añadirán al sistema de cola."
                        );

                    }

                }

                /* =========================
                   YOUTUBE
                ========================= */

                else if (
                    entrada.includes(
                        "youtube.com"
                    ) ||
                    entrada.includes(
                        "youtu.be"
                    )
                ) {

                    cancion = {
                        titulo: entrada,
                        url: entrada
                    };

                }

                /* =========================
                   BÚSQUEDA
                ========================= */

                else {

                    cancion =
                        await buscarYouTube(
                            entrada
                        );

                }

                if (!cancion) {

                    return interaction.editReply(
                        "❌ No encontré esa canción."
                    );

                }

                await prepararConexion(
                    interaction.guild.id,
                    canal
                );

                await agregarCancion(
                    interaction.guild.id,
                    cancion
                );

                const estado =
                    obtenerEstado(
                        interaction.guild.id
                    );

                const embed =
                    new EmbedBuilder()
                        .setColor("Blue")
                        .setTitle("🎵 Milo Music")
                        .setDescription(
                            `**${cancion.titulo}** fue añadida a la cola.`
                        )
                        .setThumbnail(
                            cancion.miniatura || null
                        )
                        .addFields(
                            {
                                name: "🎤 Artista / Canal",
                                value:
                                    cancion.canal ||
                                    "Desconocido",
                                inline: true
                            },
                            {
                                name: "📋 Posición",
                                value:
                                    String(
                                        estado.canciones.length
                                    ),
                                inline: true
                            }
                        );

                return interaction.editReply({
                    embeds: [embed]
                });

            } catch (error) {

                console.error(
                    "❌ Error en reproducir:",
                    error
                );

                return interaction.editReply(
                    "❌ Ocurrió un error al reproducir la canción."
                );

            }

        }

        /* =========================
           PAUSAR
        ========================= */

        if (comando === "pausar") {

            pausar(interaction.guild.id);

            return interaction.reply(
                "⏸️ Música pausada."
            );

        }

        /* =========================
           REANUDAR
        ========================= */

        if (comando === "reanudar") {

            reanudar(
                interaction.guild.id
            );

            return interaction.reply(
                "▶️ Música reanudada."
            );

        }

        /* =========================
           SALTAR
        ========================= */

        if (comando === "saltar") {

            saltar(
                interaction.guild.id
            );

            return interaction.reply(
                "⏭️ Canción saltada."
            );

        }

        /* =========================
           DETENER
        ========================= */

        if (comando === "detener") {

            detener(
                interaction.guild.id
            );

            return interaction.reply(
                "⏹️ Música detenida y cola limpiada."
            );

        }

        /* =========================
           SALIR
        ========================= */

        if (comando === "salir") {

            detener(
                interaction.guild.id
            );

            return interaction.reply(
                "👋 He salido del canal de voz."
            );

        }

        /* =========================
           COLA
        ========================= */

        if (comando === "cola") {

            const estado =
                obtenerEstado(
                    interaction.guild.id
                );

            if (
                !estado.actual &&
                estado.canciones.length === 0
            ) {

                return interaction.reply(
                    "📭 La cola está vacía."
                );

            }

            let descripcion = "";

            if (estado.actual) {

                descripcion +=
                    `🎵 **Reproduciendo:** ${estado.actual.titulo}\n\n`;

            }

            estado.canciones
                .slice(0, 10)
                .forEach(
                    (cancion, indice) => {

                        descripcion +=
                            `**${indice + 1}.** ${cancion.titulo}\n`;

                    }
                );

            const embed =
                new EmbedBuilder()
                    .setColor("Blue")
                    .setTitle("📋 Cola de Milo Music")
                    .setDescription(
                        descripcion
                    );

            return interaction.reply({
                embeds: [embed]
            });

        }

        /* =========================
           LIMPIAR
        ========================= */

        if (comando === "limpiar") {

            limpiar(
                interaction.guild.id
            );

            return interaction.reply(
                "🧹 Cola limpiada."
            );

        }

        /* =========================
           MEZCLAR
        ========================= */

        if (comando === "mezclar") {

            mezclar(
                interaction.guild.id
            );

            return interaction.reply(
                "🔀 Cola mezclada."
            );

        }

        /* =========================
           REPETIR
        ========================= */

        if (comando === "repetir") {

            const modo =
                cambiarRepeticion(
                    interaction.guild.id
                );

            const nombres = {
                apagado: "❌ Desactivado",
                cancion: "🔂 Canción",
                cola: "🔁 Cola"
            };

            return interaction.reply(
                `🔁 Repetición: **${nombres[modo]}**`
            );

        }

        /* =========================
           ACTUAL
        ========================= */

        if (comando === "actual") {

            const estado =
                obtenerEstado(
                    interaction.guild.id
                );

            if (!estado.actual) {

                return interaction.reply(
                    "🎵 No hay ninguna canción reproduciéndose."
                );

            }

            const embed =
                new EmbedBuilder()
                    .setColor("Blue")
                    .setTitle("🎵 Reproduciendo ahora")
                    .setDescription(
                        `**${estado.actual.titulo}**`
                    )
                    .setURL(
                        estado.actual.url
                    );

            return interaction.reply({
                embeds: [embed]
            });

        }

        /* =========================
           AYUDA
        ========================= */

        if (comando === "ayuda") {

            const embed =
                new EmbedBuilder()
                    .setColor("Blue")
                    .setTitle("🎵 Milo Music")
                    .setDescription(
                        "Bot de música para Discord con YouTube y Spotify."
                    )
                    .addFields(
                        {
                            name: "🎵 Música",
                            value:
                                "`/reproducir` `/pausar` `/reanudar` `/saltar` `/detener` `/salir`"
                        },
                        {
                            name: "📋 Cola",
                            value:
                                "`/cola` `/limpiar` `/mezclar`"
                        },
                        {
                            name: "🔁 Reproducción",
                            value:
                                "`/repetir` `/actual`"
                        },
                        {
                            name: "⚙️ Bot",
                            value:
                                "`/idioma` `/ping`"
                        }
                    )
                    .setFooter({
                        text:
                            "🎧 Fuentes: YouTube y Spotify"
                    });

            return interaction.reply({
                embeds: [embed]
            });

        }

        /* =========================
           PING
        ========================= */

        if (comando === "ping") {

            return interaction.reply(
                `🏓 Pong! **${cliente.ws.ping}ms**`
            );

        }

        /* =========================
           IDIOMA
        ========================= */

        if (comando === "idioma") {

            return interaction.reply(
                "🌐 El sistema de idiomas se configurará próximamente."
            );

        }

    }
);

/* =========================
   ERRORES
========================= */

cliente.on(
    "error",
    error => {

        console.error(
            "❌ Error de Discord:",
            error
        );

    }
);

/* =========================
   INICIAR
========================= */

cliente.login(
    process.env.DISCORD_TOKEN
);
