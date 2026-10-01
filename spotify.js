const https = require("https");

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

let tokenSpotify = null;
let tokenExpira = 0;

function solicitarToken() {
    return new Promise((resolve, reject) => {

        const datos = new URLSearchParams({
            grant_type: "client_credentials"
        }).toString();

        const autenticacion = Buffer
            .from(`${CLIENT_ID}:${CLIENT_SECRET}`)
            .toString("base64");

        const solicitud = https.request(
            "https://accounts.spotify.com/api/token",
            {
                method: "POST",
                headers: {
                    "Authorization": `Basic ${autenticacion}`,
                    "Content-Type":
                        "application/x-www-form-urlencoded",
                    "Content-Length":
                        Buffer.byteLength(datos)
                }
            },
            respuesta => {

                let cuerpo = "";

                respuesta.on(
                    "data",
                    parte => cuerpo += parte
                );

                respuesta.on(
                    "end",
                    () => {

                        if (respuesta.statusCode !== 200) {
                            return reject(
                                new Error(
                                    `Spotify respondió ${respuesta.statusCode}: ${cuerpo}`
                                )
                            );
                        }

                        const informacion =
                            JSON.parse(cuerpo);

                        tokenSpotify =
                            informacion.access_token;

                        tokenExpira =
                            Date.now() +
                            (informacion.expires_in * 1000) -
                            60000;

                        resolve(tokenSpotify);
                    }
                );
            }
        );

        solicitud.on(
            "error",
            reject
        );

        solicitud.write(datos);
        solicitud.end();
    });
}

async function obtenerToken() {

    if (
        tokenSpotify &&
        Date.now() < tokenExpira
    ) {
        return tokenSpotify;
    }

    return solicitarToken();
}

function solicitarAPI(url) {
    return new Promise(async (resolve, reject) => {

        try {

            const token =
                await obtenerToken();

            https.get(
                url,
                {
                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                },
                respuesta => {

                    let cuerpo = "";

                    respuesta.on(
                        "data",
                        parte => cuerpo += parte
                    );

                    respuesta.on(
                        "end",
                        () => {

                            if (
                                respuesta.statusCode !== 200
                            ) {

                                return reject(
                                    new Error(
                                        `Spotify API ${respuesta.statusCode}: ${cuerpo}`
                                    )
                                );
                            }

                            resolve(
                                JSON.parse(cuerpo)
                            );
                        }
                    );
                }
            ).on(
                "error",
                reject
            );

        } catch (error) {
            reject(error);
        }
    });
}

function obtenerTipoSpotify(url) {

    const coincidencia =
        url.match(
            /open\.spotify\.com\/(track|playlist|album)\/([a-zA-Z0-9]+)/
        );

    if (!coincidencia) {
        return null;
    }

    return {
        tipo: coincidencia[1],
        id: coincidencia[2]
    };
}

async function obtenerSpotify(url) {

    try {

        const informacion =
            obtenerTipoSpotify(url);

        if (!informacion) {
            return null;
        }

        /* =========================
           CANCIÓN
        ========================= */

        if (
            informacion.tipo === "track"
        ) {

            const datos =
                await solicitarAPI(
                    `https://api.spotify.com/v1/tracks/${informacion.id}`
                );

            return {
                tipo: "cancion",
                titulo: datos.name,
                artista: datos.artists
                    .map(
                        artista => artista.name
                    )
                    .join(", "),
                album: datos.album?.name ||
                    "Desconocido",
                imagen:
                    datos.album?.images?.[0]?.url ||
                    null,
                enlace: datos.external_urls.spotify
            };
        }

        /* =========================
           ÁLBUM
        ========================= */

        if (
            informacion.tipo === "album"
        ) {

            const datos =
                await solicitarAPI(
                    `https://api.spotify.com/v1/albums/${informacion.id}`
                );

            return {
                tipo: "album",
                titulo: datos.name,
                artista: datos.artists
                    .map(
                        artista => artista.name
                    )
                    .join(", "),
                canciones:
                    datos.tracks.items.map(
                        cancion => ({
                            titulo: cancion.name,
                            artista:
                                cancion.artists
                                    .map(
                                        artista =>
                                            artista.name
                                    )
                                    .join(", ")
                        })
                    ),
                imagen:
                    datos.images?.[0]?.url ||
                    null
            };
        }

        /* =========================
           PLAYLIST
        ========================= */

        if (
            informacion.tipo === "playlist"
        ) {

            const datos =
                await solicitarAPI(
                    `https://api.spotify.com/v1/playlists/${informacion.id}`
                );

            return {
                tipo: "playlist",
                titulo: datos.name,
                canciones:
                    datos.tracks.items
                        .filter(
                            elemento =>
                                elemento.track
                        )
                        .map(
                            elemento => ({
                                titulo:
                                    elemento.track.name,
                                artista:
                                    elemento.track.artists
                                        .map(
                                            artista =>
                                                artista.name
                                        )
                                        .join(", ")
                            })
                        ),
                imagen:
                    datos.images?.[0]?.url ||
                    null
            };
        }

        return null;

    } catch (error) {

        console.error(
            "❌ Error Spotify:",
            error.message
        );

        return null;
    }
}

module.exports = {
    obtenerSpotify
};
