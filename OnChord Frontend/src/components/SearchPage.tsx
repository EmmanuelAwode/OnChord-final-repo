import { useEffect, useState } from "react";
import { Input } from "./ui/input";
import { handleImageError } from "./ui/utils";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Avatar } from "./ui/avatar";
import { Search, Music, Disc3, Users, ListMusic, Star, Loader2 } from "lucide-react";
import { searchAlbums, type Album } from "../lib/api/musicSearch";
import { searchProfiles, type Profile } from "../lib/api/profiles";
import { getPublicReviews } from "../lib/api/reviews";
import { EmptyState } from "./EmptyState";

interface SearchPageProps {
  onOpenAlbum?: (albumId: string) => void;
  onNavigate?: (page: string) => void;
}

export function SearchPage({ onOpenAlbum, onNavigate }: SearchPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [albumResults, setAlbumResults] = useState<Album[]>([]);
  const [userResults, setUserResults] = useState<Profile[]>([]);
  const [reviewResults, setReviewResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced search effect
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setAlbumResults([]);
      setUserResults([]);
      setReviewResults([]);
      return;
    }

    const delaySearch = setTimeout(async () => {
      setIsSearching(true);
      try {
        const [albumsData, usersData, reviewsData] = await Promise.allSettled([
          searchAlbums(searchQuery, 20),
          searchProfiles(searchQuery, 10),
          getPublicReviews(20),
        ]);

        setAlbumResults(albumsData.status === 'fulfilled' ? albumsData.value : []);
        setUserResults(usersData.status === 'fulfilled' ? usersData.value : []);

        // Filter reviews client-side after fetching
        if (reviewsData.status === 'fulfilled') {
          const filtered = reviewsData.value.filter(r =>
            r.albumTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.albumArtist?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.content?.toLowerCase().includes(searchQuery.toLowerCase())
          );
          setReviewResults(filtered);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  // Use state results
  const filteredAlbums = albumResults;
  const filteredUsers = userResults;
  const filteredReviews = reviewResults;

  const hasResults = filteredAlbums.length > 0 || filteredUsers.length > 0 || filteredReviews.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="mb-2">Search</h1>
        <p className="text-muted-foreground">
          Find albums, tracks, users, and playlists
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search for albums, artists, users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-14 text-lg bg-card border-border"
          autoFocus
        />
      </div>

      {/* Results */}
      {isSearching && (
        <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Searching...</span>
        </div>
      )}

      {searchQuery.trim() && !isSearching ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-card border border-border w-full md:w-auto">
            <TabsTrigger
              value="all"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              All
            </TabsTrigger>
            <TabsTrigger
              value="albums"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Albums ({filteredAlbums.length})
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Users ({filteredUsers.length})
            </TabsTrigger>
            <TabsTrigger
              value="reviews"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Reviews ({filteredReviews.length})
            </TabsTrigger>
          </TabsList>

          {/* All Results */}
          <TabsContent value="all" className="space-y-6 mt-6">
            {hasResults ? (
              <>
                {/* Albums */}
                {filteredAlbums.length > 0 && (
                  <div>
                    <h3 className="mb-4 flex items-center gap-2">
                      <Disc3 className="w-5 h-5 text-primary" />
                      Albums
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {filteredAlbums.slice(0, 8).map((album) => (
                        <Card
                          key={album.id}
                          className="overflow-hidden bg-card border-border hover:border-primary transition-all cursor-pointer group"
                          onClick={() => onOpenAlbum?.(album.id)}
                        >
                          <img
                            src={album.cover}
                            alt={album.title}
                            className="w-full aspect-square object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="p-3">
                            <p className="text-foreground truncate">{album.title}</p>
                            <p className="text-sm text-muted-foreground truncate">{album.artist}</p>
                            <div className="flex items-center gap-1 mt-2">
                              <Star className="w-4 h-4 text-primary fill-primary" />
                              <span className="text-sm text-foreground">{album.rating}</span>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Users */}
                {filteredUsers.length > 0 && (
                  <div>
                    <h3 className="mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-secondary" />
                      Users
                    </h3>
                    <div className="grid gap-3">
                      {filteredUsers.slice(0, 5).map((user) => (
                        <Card
                          key={user.id}
                          className="p-4 bg-card border-border hover:border-secondary transition-all"
                        >
                          <div className="flex items-center gap-4">
                            <Avatar className="w-12 h-12">
                              <img src={user.avatar_url || "/default-avatar.png"} alt={user.display_name || user.username || "User"} className="object-cover" />
                            </Avatar>
                            <div className="flex-1">
                              <p className="text-foreground">{user.display_name || user.username}</p>
                              <p className="text-sm text-muted-foreground">@{user.username}</p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
                            >
                              Follow
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reviews */}
                {filteredReviews.length > 0 && (
                  <div>
                    <h3 className="mb-4 flex items-center gap-2">
                      <Music className="w-5 h-5 text-accent" />
                      Reviews
                    </h3>
                    <div className="grid gap-4">
                      {filteredReviews.slice(0, 5).map((review) => (
                        <Card
                          key={review.id}
                          className="p-4 bg-card border-border hover:border-accent transition-all cursor-pointer"
                          onClick={() => onOpenAlbum?.(review.albumId)}
                        >
                          <div className="flex gap-4">
                            <img
                              src={review.albumCover}
                              alt={review.albumTitle}
                              className="w-16 h-16 md:w-20 md:h-20 rounded-lg object-cover flex-shrink-0"
                              onError={handleImageError}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-8 h-8">
                                    <img src={review.userAvatar} alt={review.userName} className="object-cover" onError={handleImageError} />
                                  </Avatar>
                                  <div>
                                    <p className="text-sm text-foreground">{review.userName}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {review.albumTitle} · {review.albumArtist}
                                    </p>
                                  </div>
                                </div>
                                <Badge variant="secondary" className="bg-primary/20 text-primary flex items-center gap-1">
                                  <Star className="w-3 h-3 fill-primary" />
                                  {review.rating}
                                </Badge>
                              </div>
                              <p className="text-sm text-foreground line-clamp-2">{review.content}</p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                icon={Search}
                title="No Results Found"
                description={`No results found for "${searchQuery}". Try searching for different keywords.`}
              />
            )}
          </TabsContent>

          {/* Albums Tab */}
          <TabsContent value="albums" className="mt-6">
            {filteredAlbums.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredAlbums.map((album) => (
                  <Card
                    key={album.id}
                    className="overflow-hidden bg-card border-border hover:border-primary transition-all cursor-pointer group"
                    onClick={() => onOpenAlbum?.(album.id)}
                  >
                    <img
                      src={album.cover}
                      alt={album.title}
                      className="w-full aspect-square object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="p-3">
                      <p className="text-foreground truncate">{album.title}</p>
                      <p className="text-sm text-muted-foreground truncate">{album.artist}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <Star className="w-4 h-4 text-primary fill-primary" />
                        <span className="text-sm text-foreground">{album.rating}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Disc3}
                title="No Albums Found"
                description={`No albums found for "${searchQuery}".`}
              />
            )}
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="mt-6">
            {filteredUsers.length > 0 ? (
              <div className="grid gap-3">
                {filteredUsers.map((user) => (
                  <Card
                    key={user.id}
                    className="p-4 bg-card border-border hover:border-secondary transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12">
                        <img src={user.avatar_url || "/default-avatar.png"} alt={user.display_name || user.username || "User"} className="object-cover" />
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-foreground">{user.display_name || user.username}</p>
                        <p className="text-sm text-muted-foreground">@{user.username}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
                      >
                        Follow
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title="No Users Found"
                description={`No users found for "${searchQuery}".`}
              />
            )}
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="mt-6">
            {filteredReviews.length > 0 ? (
              <div className="grid gap-4">
                {filteredReviews.map((review) => (
                  <Card
                    key={review.id}
                    className="p-4 bg-card border-border hover:border-accent transition-all cursor-pointer"
                    onClick={() => onOpenAlbum?.(review.albumId)}
                  >
                    <div className="flex gap-4">
                      <img
                        src={review.albumCover}
                        alt={review.albumTitle}
                        className="w-16 h-16 md:w-20 md:h-20 rounded-lg object-cover flex-shrink-0"
                        onError={handleImageError}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                              <img src={review.userAvatar} alt={review.userName} className="object-cover" onError={handleImageError} />
                            </Avatar>
                            <div>
                              <p className="text-sm text-foreground">{review.userName}</p>
                              <p className="text-xs text-muted-foreground">
                                {review.albumTitle} · {review.albumArtist}
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="bg-primary/20 text-primary flex items-center gap-1">
                            <Star className="w-3 h-3 fill-primary" />
                            {review.rating}
                          </Badge>
                        </div>
                        <p className="text-sm text-foreground">{review.content}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Music}
                title="No Reviews Found"
                description={`No reviews found for "${searchQuery}".`}
              />
            )}
          </TabsContent>
        </Tabs>
      ) : !isSearching && !searchQuery.trim() ? (
        <div className="py-12">
          <EmptyState
            icon={Search}
            title="Start Searching"
            description="Search for your favorite albums, artists, tracks, or find new music friends."
          />
        </div>
      ) : null}
    </div>
  );
}
