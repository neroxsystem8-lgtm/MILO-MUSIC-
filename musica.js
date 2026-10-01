const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    NoSubscriberBehavior,
    entersState
} = require("@discordjs/voice");

const play = require("play-dl");

const colas = new Map();

function obtenerCola(guildId) {
    if (!colas.has(guildId)) {
        colas.set(guildId, {
            canciones: [],
            reproduciendo: null,
            conexion: null,
            reproductor: createAudioPlayer({
                behaviors: {
                    noSubscriber: NoSubscriberBehavior.Pause
                }
            }),
            repetir: "apagado"
        });
    }

    return colas.get(guildId);
}

async function entrarCanal(voiceChannel) {
    const conexion = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: true
    });

    await entersState(
        conexion,
        VoiceConnectionStatus.Ready,
        30_000
    );

    return conexion;
}

async function reproducirSiguiente(guildId) {
    const cola = obtenerCola(guildId);

    if (cola.canciones.length === 0) {
        cola.reproduciendo = null;
        return;
    }

    const cancion = cola.canciones.shift();

    cola.reproduciendo = cancion;

    try {
        const stream = await play.stream(cancion.url);

        const recurso = createAudioResource(stream.stream, {
            inputType: stream.type,
            inlineVolume: true
        });

        recurso.volume.setVolume(1);

        cola.reproductor.play(recurso);

        if (cola.conexion) {
            cola.conexion.subscribe(cola.reproductor);
        }

    } catch (error) {
        console.error("❌ Error reproduciendo:", error);

        cola.reproduciendo = null;
        await reproducirSiguiente(guildId);
    }
}

async function agregarCancion(guildId, cancion) {
    const cola = obtenerCola(guildId);

    cola.canciones.push(cancion);

    if (!cola.reproduciendo) {
        await reproducirSiguiente(guildId);
    }
}

function configurarReproductor(guildId) {
    const cola = obtenerCola(guildId);

    cola.reproductor.on(
        AudioPlayerStatus.Idle,
        async () => {

            if (
                cola.repetir === "cancion" &&
                cola.reproduciendo
            ) {
                cola.canciones.unshift(
                    cola.reproduciendo
                );
            }

            if (
                cola.repetir === "cola" &&
                cola.reproduciendo
            ) {
                cola.canciones.push(
                    cola.reproduciendo
                );
            }

            cola.reproduciendo = null;

            await reproducirSiguiente(guildId);
        }
    );
}

async function prepararConexion(
    guildId,
    voiceChannel
) {
    const cola = obtenerCola(guildId);

    if (!cola.conexion) {
        cola.conexion =
            await entrarCanal(voiceChannel);

        cola.conexion.subscribe(
            cola.reproductor
        );
    }

    configurarReproductor(guildId);

    return cola;
}

function pausar(guildId) {
    const cola = obtenerCola(guildId);
    return cola.reproductor.pause();
}

function reanudar(guildId) {
    const cola = obtenerCola(guildId);
    return cola.reproductor.unpause();
}

function saltar(guildId) {
    const cola = obtenerCola(guildId);
    return cola.reproductor.stop();
}

function detener(guildId) {
    const cola = obtenerCola(guildId);

    cola.canciones = [];
    cola.reproduciendo = null;
    cola.repetir = "apagado";

    cola.reproductor.stop();

    if (cola.conexion) {
        cola.conexion.destroy();
        cola.conexion = null;
    }

    colas.delete(guildId);
}

function limpiar(guildId) {
    const cola = obtenerCola(guildId);
    cola.canciones = [];
}

function mezclar(guildId) {
    const cola = obtenerCola(guildId);

    for (
        let i = cola.canciones.length - 1;
        i > 0;
        i--
    ) {
        const j =
            Math.floor(Math.random() * (i + 1));

        [
            cola.canciones[i],
            cola.canciones[j]
        ] = [
            cola.canciones[j],
            cola.canciones[i]
        ];
    }

    return cola.canciones;
}

function obtenerEstado(guildId) {
    const cola = obtenerCola(guildId);

    return {
        actual: cola.reproduciendo,
        canciones: cola.canciones,
        repetir: cola.repetir
    };
}

function cambiarRepeticion(guildId) {
    const cola = obtenerCola(guildId);

    if (cola.repetir === "apagado") {
        cola.repetir = "cancion";
    } else if (cola.repetir === "cancion") {
        cola.repetir = "cola";
    } else {
        cola.repetir = "apagado";
    }

    return cola.repetir;
}

module.exports = {
    prepararConexion,
    agregarCancion,
    reproducirSiguiente,
    pausar,
    reanudar,
    saltar,
    detener,
    limpiar,
    mezclar,
    obtenerEstado,
    cambiarRepeticion
};
