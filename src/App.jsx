
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  Stack,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Bookmark,
  BookmarkBorder,
  Close,
  Movie as MovieIcon,
  Search,
  Star,
  Tv,
} from "@mui/icons-material";
import {
  BrowserRouter,
  Route,
  Routes,
  NavLink,
  useLocation,
} from "react-router-dom";

// Local development server. Keep your API key on the Express server.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/omdb";

function MovieDiscovery() {
  const location = useLocation();
  const requestId = useRef(0);
  const searchRef = useRef("");

  const [movies, setMovies] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailsById, setDetailsById] = useState({});
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [genre, setGenre] = useState("All genres");

  const [watchlist, setWatchlist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("moviebox-watchlist")) || [];
    } catch {
      return [];
    }
  });

  // Save the watchlist between browser sessions.
  useEffect(() => {
    localStorage.setItem(
      "moviebox-watchlist",
      JSON.stringify(watchlist)
    );
  }, [watchlist]);

  const currentPath = location.pathname;
  const isWatchlist = currentPath === "/watchlist";

  const pageType =
    currentPath === "/movies"
      ? "movie"
      : currentPath === "/tv-shows"
        ? "series"
        : "all";

  // Search OMDb through the Express backend.
  const searchMovies = useCallback(async (term, type = "all") => {
    const title = term.trim();

    if (!title) {
      setError("Enter a movie or TV show title.");
      setMovies([]);
      return;
    }

    const thisRequest = ++requestId.current;

    setLoading(true);
    setError("");
    setGenre("All genres");

    try {
      const params = new URLSearchParams({ s: title });

      if (type !== "all") {
        params.set("type", type);
      }

      const response = await fetch(`${API_URL}?${params.toString()}`);

      if (!response.ok) {
        throw new Error("The movie server returned an error.");
      }

      const data = await response.json();

      if (data.Response === "False") {
        if (thisRequest === requestId.current) {
          setMovies([]);
          setDetailsById({});
          setError(data.Error || "No results found.");
        }
        return;
      }

      const results = data.Search || [];

      if (thisRequest !== requestId.current) return;

      setMovies(results);
      setDetailsById({});

      // Fetch genres, ratings, and plot details for the search results.
      const detailResults = await Promise.all(
        results.map(async (movie) => {
          try {
            const params = new URLSearchParams({
              i: movie.imdbID,
              plot: "full",
            });

            const detailResponse = await fetch(
              `${API_URL}?${params.toString()}`
            );

            if (!detailResponse.ok) return null;

            const details = await detailResponse.json();

            if (details.Response !== "True") return null;

            return [movie.imdbID, details];
          } catch {
            return null;
          }
        })
      );

      if (thisRequest === requestId.current) {
        const validDetails = detailResults.filter(Boolean);
        setDetailsById(Object.fromEntries(validDetails));
      }
    } catch (err) {
      if (thisRequest === requestId.current) {
        setMovies([]);
        setError(
          "Unable to load movies. Check that your Express server is running."
        );
      }
      console.error("Movie search failed:", err);
    } finally {
      if (thisRequest === requestId.current) {
        setLoading(false);
      }
    }
  }, []);

  // Load results when opening Home, Movies, or TV Shows.
  useEffect(() => {
    if (isWatchlist) return;

    const initialTerm = searchRef.current.trim() || "Batman";
    searchMovies(initialTerm, pageType);
  }, [currentPath, isWatchlist, pageType, searchMovies]);

  // Get the full information for a selected movie.
  async function openMovie(movie) {
    const cachedDetails = detailsById[movie.imdbID];

    setSelectedMovie({
      ...movie,
      ...(cachedDetails || {}),
    });

    if (cachedDetails?.Plot && cachedDetails.Plot !== "N/A") return;

    setDetailLoading(true);

    try {
      const params = new URLSearchParams({
        i: movie.imdbID,
        plot: "full",
      });

      const response = await fetch(`${API_URL}?${params.toString()}`);
      const data = await response.json();

      if (!response.ok || data.Response !== "True") {
        throw new Error(data.Error || "Movie details are unavailable.");
      }

      setDetailsById((previous) => ({
        ...previous,
        [movie.imdbID]: data,
      }));

      setSelectedMovie(data);
    } catch (err) {
      console.error("Movie details failed:", err);
      setError("Could not load the full movie details.");
    } finally {
      setDetailLoading(false);
    }
  }

  // Add or remove a movie from the persistent watchlist.
  function toggleWatchlist(movie) {
    const completeMovie = {
      ...movie,
      ...(detailsById[movie.imdbID] || {}),
    };

    setWatchlist((current) =>
      current.some((item) => item.imdbID === movie.imdbID)
        ? current.filter((item) => item.imdbID !== movie.imdbID)
        : [...current, completeMovie]
    );
  }

  function isSaved(movie) {
    return watchlist.some(
      (item) => item.imdbID === movie.imdbID
    );
  }

  // Build the list of genres found in the loaded movie details.
  const genres = [
    "All genres",
    ...new Set(
      Object.values(detailsById)
        .flatMap((movie) =>
          movie.Genre && movie.Genre !== "N/A"
            ? movie.Genre.split(",").map((item) => item.trim())
            : []
        )
        .filter(Boolean)
    ),
  ];

  const sourceMovies = isWatchlist
    ? watchlist
    : movies.filter((movie) =>
        pageType === "all" ? true : movie.Type === pageType
      );

  const visibleMovies = sourceMovies.filter((movie) => {
    if (genre === "All genres") return true;

    const movieGenres =
      detailsById[movie.imdbID]?.Genre || movie.Genre || "";

    return movieGenres
      .split(",")
      .map((item) => item.trim())
      .includes(genre);
  });

  const pageTitle = isWatchlist
    ? "My Watchlist"
    : currentPath === "/movies"
      ? "Movies"
      : currentPath === "/tv-shows"
        ? "TV Shows"
        : "Discover Movies";

  function navButton(label, path, icon) {
    return (
      <Button
        key={path}
        component={NavLink}
        to={path}
        startIcon={icon}
        sx={{
          color: location.pathname === path ? "#ffffff" : "#b8b8c8",
          bgcolor:
            location.pathname === path
              ? "rgba(255,255,255,0.10)"
              : "transparent",
          borderRadius: 2,
          textTransform: "none",
          whiteSpace: "nowrap",
          "&:hover": { bgcolor: "rgba(255,255,255,0.10)" },
        }}
      >
        {label}
      </Button>
    );
  }

  function renderMovieCard(movie) {
    const details = detailsById[movie.imdbID] || movie;
    const poster =
      details.Poster && details.Poster !== "N/A"
        ? details.Poster
        : null;

    return (
      <Card
        key={movie.imdbID}
        sx={{
          bgcolor: "#181821",
          color: "white",
          border: "1px solid #292936",
          borderRadius: 3,
          overflow: "hidden",
          transition: "transform 0.2s, border-color 0.2s",
          "&:hover": {
            transform: "translateY(-4px)",
            borderColor: "#f5c518",
          },
        }}
      >
        <Box
          onClick={() => openMovie({ ...movie, ...details })}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter") openMovie(movie);
          }}
          sx={{
            cursor: "pointer",
            position: "relative",
            aspectRatio: "2 / 3",
            bgcolor: "#252531",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {poster ? (
            <Box
              component="img"
              src={poster}
              alt={movie.Title}
              loading="lazy"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                position: "absolute",
                inset: 0,
              }}
            />
          ) : (
            <Stack alignItems="center" spacing={1}>
              <MovieIcon sx={{ fontSize: 52, color: "#777788" }} />
              <Typography variant="caption" color="grey.400">
                No poster available
              </Typography>
            </Stack>
          )}

          {details.imdbRating && details.imdbRating !== "N/A" && (
            <Chip
              icon={<Star sx={{ color: "#f5c518 !important" }} />}
              label={details.imdbRating}
              size="small"
              sx={{
                position: "absolute",
                top: 9,
                left: 9,
                bgcolor: "rgba(0,0,0,0.85)",
                color: "white",
                fontWeight: 700,
              }}
            />
          )}
        </Box>

        <CardContent sx={{ pb: 1 }}>
          <Typography
            variant="subtitle1"
            fontWeight={700}
            noWrap
            title={movie.Title}
          >
            {movie.Title}
          </Typography>

          <Typography variant="body2" color="grey.400">
            {movie.Year || "Year unavailable"}
            {" · "}
            {movie.Type === "series" ? "TV Series" : "Movie"}
          </Typography>

          {details.Genre && details.Genre !== "N/A" && (
            <Typography
              variant="caption"
              color="grey.400"
              display="block"
              sx={{ mt: 0.75 }}
            >
              {details.Genre.split(",").slice(0, 2).join(",")}
            </Typography>
          )}
        </CardContent>

        <CardActions sx={{ px: 2, pb: 1.5 }}>
          <Button
            size="small"
            onClick={() => openMovie({ ...movie, ...details })}
            sx={{ color: "#f5c518", textTransform: "none" }}
          >
            Details
          </Button>

          <Box sx={{ flex: 1 }} />

          <Tooltip
            title={
              isSaved(movie)
                ? "Remove from watchlist"
                : "Add to watchlist"
            }
          >
            <IconButton
              aria-label="Toggle watchlist"
              onClick={() => toggleWatchlist(movie)}
              sx={{ color: isSaved(movie) ? "#f5c518" : "#c4c4d0" }}
            >
              {isSaved(movie) ? <Bookmark /> : <BookmarkBorder />}
            </IconButton>
          </Tooltip>
        </CardActions>
      </Card>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#101014",
        color: "white",
        pb: 6,
      }}
    >
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: "rgba(16,16,20,0.96)",
          borderBottom: "1px solid #30303a",
          backdropFilter: "blur(12px)",
        }}
      >
        <Toolbar sx={{ gap: 2, flexWrap: "wrap", py: 1.5 }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ mr: { xs: 0, md: 2 } }}
          >
            <MovieIcon sx={{ color: "#f5c518", fontSize: 34 }} />
            <Typography
              variant="h5"
              fontWeight={900}
              sx={{ letterSpacing: -1 }}
            >
              MovieBox
            </Typography>
          </Stack>

          <Stack
            direction="row"
            spacing={0.5}
            sx={{
              order: { xs: 3, md: 2 },
              width: { xs: "100%", md: "auto" },
              overflowX: "auto",
            }}
          >
            {navButton("Home", "/", <MovieIcon />)}
            {navButton("Movies", "/movies", <MovieIcon />)}
            {navButton("TV Shows", "/tv-shows", <Tv />)}
            {navButton(
              `My Watchlist (${watchlist.length})`,
              "/watchlist",
              <BookmarkBorder />
            )}
          </Stack>
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          maxWidth: 1440,
          mx: "auto",
          px: { xs: 2, md: 4 },
          pt: 4,
        }}
      >
        {!isWatchlist && (
          <Box
            sx={{
              p: { xs: 3, md: 5 },
              mb: 4,
              borderRadius: 4,
              background:
                "linear-gradient(115deg, #29253a 0%, #1c1b2c 55%, #16161d 100%)",
              border: "1px solid #343244",
            }}
          >
            <Typography
              variant="overline"
              sx={{
                color: "#f5c518",
                letterSpacing: 3,
                fontWeight: 800,
              }}
            >
              YOUR NEXT FAVORITE FILM
            </Typography>

            <Typography
              variant="h3"
              fontWeight={900}
              sx={{
                mt: 1,
                mb: 1.5,
                fontSize: { xs: 32, md: 48 },
              }}
            >
              Find something great to watch.
            </Typography>

            <Typography
              color="grey.400"
              sx={{ mb: 3, maxWidth: 650 }}
            >
              Search movies and TV shows, explore genres, and save your
              favorites to your personal watchlist.
            </Typography>

            <Box
              component="form"
              onSubmit={(event) => {
                event.preventDefault();
                searchRef.current = search;
                searchMovies(search, pageType);
              }}
              sx={{
                display: "flex",
                gap: 1,
                maxWidth: 700,
                flexDirection: { xs: "column", sm: "row" },
              }}
            >
              <TextField
                fullWidth
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  searchRef.current = event.target.value;
                }}
                placeholder="Search for a movie or TV show..."
                aria-label="Search movies and TV shows"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: "grey.400" }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    color: "white",
                    bgcolor: "#101014",
                    borderRadius: 2,
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#41414d",
                  },
                }}
              />

              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                startIcon={<Search />}
                sx={{
                  px: 4,
                  bgcolor: "#f5c518",
                  color: "#151515",
                  fontWeight: 800,
                  textTransform: "none",
                  "&:hover": { bgcolor: "#dfb20c" },
                }}
              >
                Search
              </Button>
            </Box>
          </Box>
        )}

        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }}
          spacing={2}
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography variant="h4" fontWeight={800}>
              {pageTitle}
            </Typography>
            <Typography color="grey.500" variant="body2" sx={{ mt: 0.5 }}>
              {isWatchlist
                ? "Your saved movies and shows."
                : `${visibleMovies.length} titles displayed`}
            </Typography>
          </Box>

          {!isWatchlist && (
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <Select
                value={genre}
                onChange={(event) => setGenre(event.target.value)}
                aria-label="Filter by genre"
                sx={{
                  color: "white",
                  bgcolor: "#181821",
                  borderRadius: 2,
                  ".MuiOutlinedInput-notchedOutline": {
                    borderColor: "#393945",
                  },
                  ".MuiSvgIcon-root": { color: "white" },
                }}
              >
                {genres.map((item) => (
                  <MenuItem key={item} value={item}>
                    {item}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Stack>

        {error && (
          <Alert
            severity="warning"
            onClose={() => setError("")}
            sx={{ mb: 3 }}
          >
            {error}
          </Alert>
        )}

        {loading && (
          <Stack alignItems="center" spacing={2} sx={{ py: 6 }}>
            <CircularProgress sx={{ color: "#f5c518" }} />
            <Typography color="grey.400">
              Discovering movies...
            </Typography>
          </Stack>
        )}

        {!loading && visibleMovies.length > 0 && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(min(100%, 175px), 1fr))",
              gap: { xs: 2, md: 2.5 },
            }}
          >
            {visibleMovies.map(renderMovieCard)}
          </Box>
        )}

        {!loading && !error && visibleMovies.length === 0 && (
          <Box
            sx={{
              textAlign: "center",
              py: 8,
              px: 2,
              border: "1px dashed #393945",
              borderRadius: 3,
            }}
          >
            <MovieIcon sx={{ fontSize: 52, color: "#666675", mb: 1 }} />
            <Typography variant="h6" fontWeight={700}>
              {isWatchlist
                ? "Your watchlist is empty"
                : "No matching titles found"}
            </Typography>
            <Typography color="grey.500" sx={{ mt: 1 }}>
              {isWatchlist
                ? "Use the bookmark icon on a movie to save it here."
                : "Try another title or choose a different genre."}
            </Typography>
          </Box>
        )}

        <Divider sx={{ borderColor: "#292933", mt: 6, mb: 2 }} />

        <Typography
          variant="caption"
          color="grey.600"
          textAlign="center"
          display="block"
        >
          MovieBox · Movie information provided by OMDb
        </Typography>
      </Box>

      <Dialog
        open={Boolean(selectedMovie)}
        onClose={() => setSelectedMovie(null)}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            bgcolor: "#191920",
            color: "white",
            border: "1px solid #353542",
            borderRadius: 3,
          },
        }}
      >
        {selectedMovie && (
          <>
            <DialogTitle
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                pr: 1,
              }}
            >
              <Box sx={{ flex: 1, fontWeight: 800 }}>
                {selectedMovie.Title}
              </Box>
              <IconButton
                onClick={() => setSelectedMovie(null)}
                sx={{ color: "white" }}
                aria-label="Close details"
              >
                <Close />
              </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ borderColor: "#353542" }}>
              {detailLoading ? (
                <Stack alignItems="center" sx={{ py: 5 }}>
                  <CircularProgress sx={{ color: "#f5c518" }} />
                  <Typography sx={{ mt: 2 }} color="grey.400">
                    Loading movie details...
                  </Typography>
                </Stack>
              ) : (
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={3}
                  sx={{ pt: 1 }}
                >
                  {selectedMovie.Poster &&
                    selectedMovie.Poster !== "N/A" && (
                      <Box
                        component="img"
                        src={selectedMovie.Poster}
                        alt={selectedMovie.Title}
                        sx={{
                          width: { xs: "100%", sm: 220 },
                          maxHeight: 330,
                          objectFit: "contain",
                          alignSelf: "flex-start",
                          borderRadius: 2,
                          bgcolor: "#252531",
                        }}
                      />
                    )}

                  <Box sx={{ flex: 1 }}>
                    <Stack
                      direction="row"
                      spacing={1}
                      useFlexGap
                      flexWrap="wrap"
                      sx={{ mb: 2 }}
                    >
                      {selectedMovie.Year &&
                        <Chip label={selectedMovie.Year} />}
                      {selectedMovie.Runtime &&
                        selectedMovie.Runtime !== "N/A" && (
                          <Chip label={selectedMovie.Runtime} />
                        )}
                      {selectedMovie.Rated &&
                        selectedMovie.Rated !== "N/A" && (
                          <Chip label={selectedMovie.Rated} />
                        )}
                      {selectedMovie.imdbRating &&
                        selectedMovie.imdbRating !== "N/A" && (
                          <Chip
                            icon={<Star sx={{ color: "#f5c518 !important" }} />}
                            label={`IMDb ${selectedMovie.imdbRating}`}
                            sx={{ color: "white" }}
                          />
                        )}
                    </Stack>

                    <Typography color="#f5c518" fontWeight={700} sx={{ mb: 1 }}>
                      {selectedMovie.Genre || "Genre unavailable"}
                    </Typography>

                    <Typography sx={{ mb: 2, lineHeight: 1.8 }}>
                      {selectedMovie.Plot &&
                      selectedMovie.Plot !== "N/A"
                        ? selectedMovie.Plot
                        : "A plot summary is not available."}
                    </Typography>

                    {selectedMovie.Director &&
                      selectedMovie.Director !== "N/A" && (
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Director:</strong> {selectedMovie.Director}
                        </Typography>
                      )}

                    {selectedMovie.Actors &&
                      selectedMovie.Actors !== "N/A" && (
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Cast:</strong> {selectedMovie.Actors}
                        </Typography>
                      )}

                    {selectedMovie.Type && (
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Type:</strong> {selectedMovie.Type}
                      </Typography>
                    )}
                  </Box>
                </Stack>
              )}
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
              <Button
                onClick={() => toggleWatchlist(selectedMovie)}
                startIcon={
                  isSaved(selectedMovie) ? <Bookmark /> : <BookmarkBorder />
                }
                sx={{ color: "#f5c518", textTransform: "none" }}
              >
                {isSaved(selectedMovie)
                  ? "Remove from Watchlist"
                  : "Add to Watchlist"}
              </Button>
              <Button
                onClick={() => setSelectedMovie(null)}
                sx={{ color: "white", textTransform: "none" }}
              >
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MovieDiscovery />} />
        <Route path="/movies" element={<MovieDiscovery />} />
        <Route path="/tv-shows" element={<MovieDiscovery />} />
        <Route path="/watchlist" element={<MovieDiscovery />} />
      </Routes>
    </BrowserRouter>
  );
}

