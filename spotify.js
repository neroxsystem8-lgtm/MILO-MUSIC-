const play = require("play-dl");

async function obtenerSpotify(url) {
    try {
        const tipo = play.sp_validate(url);

        if (!tipo) {
            return null;
        }

        if (tipo === "track") {
            const datos = await play.spotify(url);

            return {
                tipo: "cancion",
                titulo: datos.name,
                artista: datos.artists
                    .map(artista => artista.name)
                    .join(", "),
                enlace: url
            };
        }

        if (tipo === "playlist") {
            const playlist = await play.spotify(url);

            const canciones = playlist.fetched_tracks.map(cancion => ({
                titulo: cancion.name,
                artista: cancion.artists
                    .map(artista => artista.name)
                    .join(", ")
            }));

            return {
                tipo: "playlist",
                titulo: playlist.name,
                canciones
            };
        }

        return null;

    } catch (error) {
        console.error("❌ Error con Spotify:", error);
        return null;
    }
}

module.exports = {
    obtenerSpotify
};
