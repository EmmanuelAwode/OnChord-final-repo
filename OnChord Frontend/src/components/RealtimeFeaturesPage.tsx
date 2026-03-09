import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Radio, Activity, Users, Music } from 'lucide-react';
import ActivityFeed from './ActivityFeed';
import CollaborativePlaylistView from './CollaborativePlaylistView';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { PageHeader } from './PageHeader';

interface RealtimeFeaturesPageProps {
  onNavigate?: (page: string) => void;
}

export default function RealtimeFeaturesPage({ onNavigate }: RealtimeFeaturesPageProps) {
  const [activeTab, setActiveTab] = useState('activity');

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <PageHeader
        title="Live Activity"
        subtitle="See what's happening in real-time"
        onBack={onNavigate ? () => onNavigate('home') : undefined}
      />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="activity" className="gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Activity Feed</span>
              <span className="sm:hidden">Feed</span>
            </TabsTrigger>
            <TabsTrigger value="playlists" className="gap-2">
              <Music className="h-4 w-4" />
              <span className="hidden sm:inline">Collaborative</span>
              <span className="sm:hidden">Playlists</span>
            </TabsTrigger>
            <TabsTrigger value="demo" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Demo Features</span>
              <span className="sm:hidden">Demo</span>
            </TabsTrigger>
          </TabsList>

          {/* Activity Feed Tab */}
          <TabsContent value="activity">
            <ActivityFeed />
          </TabsContent>

          {/* Collaborative Playlists Tab */}
          <TabsContent value="playlists">
            <CollaborativePlaylistView playlistId="3fa85f64-5717-4562-b3fc-2c963f66afa6" />
          </TabsContent>

          {/* Demo Features Tab */}
          <TabsContent value="demo" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Radio className="h-5 w-5 text-primary animate-pulse" />
                  Real-Time Features Demo
                </CardTitle>
                <CardDescription>
                  Interactive demo of OnChord's live features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Feature Cards */}
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">🔔 Live Notifications</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Click the bell icon in the navigation to see real-time notifications with:
                      </p>
                      <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                        <li>Live updates when friends like your reviews</li>
                        <li>Comment notifications</li>
                        <li>New follower alerts</li>
                        <li>Playlist collaboration invites</li>
                      </ul>
                      <p className="text-xs text-muted-foreground italic mt-3">
                        Currently showing mock data. Connect to Supabase for live updates!
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">📡 Activity Feed</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        See what your friends are doing in real-time:
                      </p>
                      <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                        <li>Live "Listening Now" status</li>
                        <li>New reviews as they're posted</li>
                        <li>Likes, follows, and playlist updates</li>
                        <li>Filter to show only live activity</li>
                      </ul>
                      <Button 
                        onClick={() => setActiveTab('activity')} 
                        size="sm" 
                        className="mt-3"
                      >
                        View Activity Feed
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">⌨️ Typing Indicators</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        See when others are typing in comments and messages:
                      </p>
                      <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                        <li>Shows up to 3 user avatars</li>
                        <li>Animated "..." indicator</li>
                        <li>Auto-hides after 3 seconds of inactivity</li>
                        <li>Works in review comments and DMs</li>
                      </ul>
                      <p className="text-xs text-muted-foreground italic mt-3">
                        Integrated in CommentsModal and MessagingPage
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">🎼 Collaborative Playlists</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Edit playlists together in real-time:
                      </p>
                      <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                        <li>See who's editing right now</li>
                        <li>Live track additions and removals</li>
                        <li>Drag-and-drop reordering syncs instantly</li>
                        <li>Toast notifications for changes</li>
                      </ul>
                      <Button 
                        onClick={() => setActiveTab('playlists')} 
                        size="sm" 
                        className="mt-3"
                      >
                        Try Collaborative Playlist
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Technical Overview */}
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-base">🔧 Technical Implementation</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Custom Hooks Created:</h4>
                      <ul className="text-xs space-y-1 list-disc list-inside text-muted-foreground font-mono">
                        <li>useRealtimeNotifications - Notification system with Supabase Realtime</li>
                        <li>useRealtimeActivity - Live activity feed with presence tracking</li>
                        <li>useTypingIndicator - Real-time typing status</li>
                        <li>useCollaborativePlaylist - Multi-user playlist editing</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Components:</h4>
                      <ul className="text-xs space-y-1 list-disc list-inside text-muted-foreground font-mono">
                        <li>NotificationsPanel - Dropdown with live notifications</li>
                        <li>ActivityFeed - Real-time friend activity stream</li>
                        <li>TypingIndicator - Shows "User is typing..." status</li>
                        <li>CollaborativePlaylistView - Full collaborative UI</li>
                      </ul>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        <strong>Note:</strong> All features currently use mock data with simulated
                        real-time behavior. To enable true real-time functionality, connect to a
                        Supabase project and create the necessary database tables (notifications,
                        activities, playlist_tracks).
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
