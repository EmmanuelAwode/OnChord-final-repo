import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Brain, Users, Sparkles, BarChart3, Music, TrendingUp, Disc, Headphones, Loader2 } from "lucide-react";
import { Card } from "./ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TasteMatchingPage } from "./TasteMatchingPage";
import { PlaylistMoodPage } from "./PlaylistMoodPage";
import { MusicPersonalityPage } from "./MusicPersonalityPage";
import { getFriendsReviews, type Review } from "../lib/api/reviews";
import { getListeningStats, type ListeningStats, type MonthlyListening, type GenreDistribution } from "../lib/api/insightsData";

interface InsightsPageProps {
  onNavigate?: (page: string) => void;
  defaultTab?: string;
}

export function InsightsPage({ onNavigate, defaultTab = "dashboard" }: InsightsPageProps = {}) {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<ListeningStats | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyListening[]>([]);
  const [genreData, setGenreData] = useState<GenreDistribution[]>([]);
  const [isRealData, setIsRealData] = useState(false);
  const [friendsReviews, setFriendsReviews] = useState<Review[]>([]);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        // Load stats and friend reviews in parallel
        const [statsResult, reviewsResult] = await Promise.all([
          getListeningStats(),
          getFriendsReviews()
        ]);
        
        console.log("[InsightsPage] Stats loaded:", statsResult);
        setStats(statsResult.stats);
        setMonthlyData(statsResult.monthlyData);
        setGenreData(statsResult.genreDistribution);
        setIsRealData(statsResult.isRealData);
        
        console.log("[InsightsPage] Friend reviews loaded:", reviewsResult.length);
        setFriendsReviews(reviewsResult);
      } catch (error) {
        console.error("[InsightsPage] Failed to load data:", error);
        // Set fallback data on error
        setStats({
          totalHours: 0,
          topGenre: "Connect Spotify",
          topArtist: "Unknown",
          tracksPlayed: 0,
          artistsDiscovered: 0,
        });
        setGenreData([]);
        setFriendsReviews([]);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <div className="bg-gradient-to-br from-primary/20 to-secondary/20 p-4 rounded-full">
            <Brain className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl text-foreground">Music Insights</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Discover your musical personality, find taste matches, and analyze your listening moods
        </p>
      </div>

      {/* Insights Tabs */}
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="bg-card border border-border w-full md:w-auto grid grid-cols-2 md:grid-cols-4 gap-2 p-1">
          <TabsTrigger
            value="dashboard"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-chart-5 data-[state=active]:to-chart-5/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Dashboard</span>
            <span className="sm:hidden">Stats</span>
          </TabsTrigger>
          <TabsTrigger
            value="taste"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
          >
            <Users className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Taste Match</span>
            <span className="sm:hidden">Match</span>
          </TabsTrigger>
          <TabsTrigger
            value="mood"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-secondary data-[state=active]:to-secondary/80 data-[state=active]:text-secondary-foreground data-[state=active]:shadow-md"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Mood Analysis</span>
            <span className="sm:hidden">Mood</span>
          </TabsTrigger>
          <TabsTrigger
            value="personality"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-accent data-[state=active]:to-accent/80 data-[state=active]:text-accent-foreground data-[state=active]:shadow-md"
          >
            <Brain className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Personality</span>
            <span className="sm:hidden">Profile</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <div className="space-y-6">
            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
                <span className="text-muted-foreground">Loading your stats...</span>
              </div>
            )}

            {/* Data Source Indicator */}
            {!isLoading && !isRealData && (
              <div className="text-center text-xs text-muted-foreground">
                Connect Spotify for personalized stats
              </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <Card className="p-3 md:p-4 bg-card border-border">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="bg-primary/20 p-2 md:p-3 rounded-lg">
                    <Headphones className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-muted-foreground text-xs md:text-sm truncate">Hours Listened</p>
                    <p className="text-lg md:text-2xl text-foreground">{isLoading ? "—" : stats?.totalHours}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-3 md:p-4 bg-card border-border">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="bg-secondary/20 p-2 md:p-3 rounded-lg">
                    <Music className="w-4 h-4 md:w-5 md:h-5 text-secondary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-muted-foreground text-xs md:text-sm truncate">Tracks Played</p>
                    <p className="text-lg md:text-2xl text-foreground">{isLoading ? "—" : stats?.tracksPlayed}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-3 md:p-4 bg-card border-border">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="bg-chart-4/20 p-2 md:p-3 rounded-lg">
                    <Disc className="w-4 h-4 md:w-5 md:h-5 text-chart-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-muted-foreground text-xs md:text-sm truncate">Top Genre</p>
                    <p className="text-sm md:text-base text-foreground truncate">{isLoading ? "—" : stats?.topGenre}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-3 md:p-4 bg-card border-border">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="bg-chart-5/20 p-2 md:p-3 rounded-lg">
                    <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-chart-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-muted-foreground text-xs md:text-sm truncate">New Artists</p>
                    <p className="text-lg md:text-2xl text-foreground">{isLoading ? "—" : stats?.artistsDiscovered}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
              {/* Monthly Listening */}
              <Card className="p-4 md:p-6 bg-card border-border">
                <h3 className="text-base md:text-lg text-foreground mb-3 md:mb-4">Monthly Listening</h3>
                {monthlyData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
                    <BarChart3 className="w-12 h-12 mb-2 opacity-50" />
                    <p className="text-sm">No listening data available</p>
                    <p className="text-xs mt-1">Connect Spotify to see your stats</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#4C566A" />
                      <XAxis dataKey="month" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#3B4252",
                          border: "1px solid #4C566A",
                          borderRadius: "8px",
                          color: "#F3F4F6",
                        }}
                      />
                      <Bar dataKey="hours" fill="#A78BFA" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>

              {/* Genre Distribution */}
              <Card className="p-4 md:p-6 bg-card border-border">
                <h3 className="text-base md:text-lg text-foreground mb-3 md:mb-4">Genre Distribution</h3>
                {genreData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
                    <Disc className="w-12 h-12 mb-2 opacity-50" />
                    <p className="text-sm">No genre data available</p>
                    <p className="text-xs mt-1">Connect Spotify to see your genres</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                    <Pie
                      data={genreData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ genre, value }) => `${genre} ${value}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {genreData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={["#A78BFA", "#34D399", "#60A5FA", "#F472B6", "#FBBF24"][index % 5]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#3B4252",
                        border: "1px solid #4C566A",
                        borderRadius: "8px",
                        color: "#F3F4F6",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                )}
              </Card>
            </div>

            {/* Recent Friend Activity */}
            <Card className="p-4 md:p-6 bg-card border-border">
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <h3 className="text-sm md:text-base lg:text-lg text-foreground truncate">Your Friends Recently Reviewed</h3>
                <button 
                  onClick={() => onNavigate?.("friends-reviews")}
                  className="text-primary text-xs md:text-sm hover:underline flex-shrink-0 ml-2"
                >
                  View All
                </button>
              </div>
              <div className="space-y-4">
                {friendsReviews.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No friend reviews yet.</p>
                    <p className="text-sm mt-1">Follow other users to see their reviews here!</p>
                  </div>
                ) : (
                  friendsReviews.slice(0, 3).map((review) => (
                    <div key={review.id} className="flex gap-4 p-4 bg-background rounded-lg">
                      <img
                        src={review.albumCover || "/placeholder-album.png"}
                        alt={review.albumTitle}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-foreground">{review.userName}</p>
                          <span className="text-muted-foreground">rated</span>
                          <div className="flex items-center gap-1">
                            <span className="text-secondary">★</span>
                            <span className="text-foreground">{review.rating}</span>
                          </div>
                        </div>
                        <p className="text-sm text-foreground mb-1">
                          {review.albumTitle} by {review.albumArtist}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {review.content}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="taste" className="mt-6">
          <TasteMatchingPage onNavigate={onNavigate} />
        </TabsContent>

        <TabsContent value="mood" className="mt-6">
          <PlaylistMoodPage />
        </TabsContent>

        <TabsContent value="personality" className="mt-6">
          <MusicPersonalityPage onNavigate={onNavigate} />
        </TabsContent>
      </Tabs>
    </div>
  );
}