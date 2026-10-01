const play = require("play-dl");

async function buscarYouTube(busqueda) {
    try {
        const resultados = await play.search(busqueda, {
            limit: 1,
            source: {
                youtube: "video"
            }
        });

        if (!resultados || resultados.length === 0) {
            return null;
        }

        const video = resultados[0];

        return {
            titulo: video.title,
            url: video.url,
            duracion: video.durationRaw,
            miniatura: video.thumbnails?.[0]?.url || null,
            canal: video.channel?.name || "Desconocido"
        };

    } catch (error) {
        console.error("❌ Error buscando en YouTube:", error);
        return null;
    }
}

module.exports = {
    buscarYouTube
};
