import { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Users, RefreshCw, Radio, Music } from 'lucide-react';
import { useCollaborativePlaylist } from '../lib/useCollaborativePlaylist';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { toast } from 'sonner';

interface CollaborativePlaylistViewProps {
  playlistId: string;
}

export default function CollaborativePlaylistView({
  playlistId,
}: CollaborativePlaylistViewProps) {
  const {
    playlist,
    recentUpdates,
    activeCollaborators,
    isLoading,
    isSyncing,
    error,
    addTrack,
    removeTrack,
    reorderTracks,
    reload,
  } = useCollaborativePlaylist({ playlistId });

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Show toast for recent updates
    if (recentUpdates.length > 0) {
      const latestUpdate = recentUpdates[0];
      const message = getUpdateMessage(latestUpdate);
      toast.info(message, {
        duration: 3000,
      });
    }
  }, [recentUpdates]);

  const getUpdateMessage = (update: any) => {
    switch (update.action) {
      case 'add':
        return `${update.userName} added ${update.trackTitle}`;
      case 'remove':
        return `${update.userName} removed ${update.trackTitle}`;
      case 'reorder':
        return `${update.userName} reordered tracks`;
      default:
        return `${update.userName} made changes`;
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const tracks = playlist?.tracks || [];
    const newTracks = [...tracks];
    const draggedTrack = newTracks[draggedIndex];
    newTracks.splice(draggedIndex, 1);
    newTracks.splice(index, 0, draggedTrack);

    reorderTracks(newTracks);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleAddTrack = async (track: any) => {
    await addTrack(track);
    setIsAddDialogOpen(false);
    toast.success(`Added ${track.trackTitle} to playlist`);
  };

  const handleRemoveTrack = async (trackId: string, trackTitle: string) => {
    await removeTrack(trackId);
    toast.success(`Removed ${trackTitle} from playlist`);
  };

  // Mock search results (in production, this would search Spotify API)
  const mockSearchResults = [
    {
      trackId: 'track-1',
      trackTitle: 'Blinding Lights',
      trackArtist: 'The Weeknd',
      albumCover: 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36',
    },
    {
      trackId: 'track-2',
      trackTitle: 'Save Your Tears',
      trackArtist: 'The Weeknd',
      albumCover: 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load playlist</p>
        <Button onClick={reload} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-start gap-4">
        <img
          src={playlist.coverImage}
          alt={playlist.name}
          className="h-32 w-32 rounded-lg object-cover shadow-lg"
        />
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2">{playlist.name}</h1>
          <p className="text-muted-foreground mb-4">{playlist.description}</p>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="gap-1">
              <Music className="h-3 w-3" />
              {playlist.tracks.length} tracks
            </Badge>
            {activeCollaborators.length > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Radio className="h-3 w-3 animate-pulse" />
                {activeCollaborators.length} active
              </Badge>
            )}
            {isSyncing && (
              <Badge variant="outline" className="gap-1">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Syncing...
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Active Collaborators */}
      {activeCollaborators.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active Now
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {activeCollaborators.map((collaborator) => (
                <div key={collaborator.user_id} className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={collaborator.user_avatar}
                      alt={collaborator.user_name}
                    />
                    <AvatarFallback>{collaborator.user_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{collaborator.user_name}</span>
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Track Button */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogTrigger asChild>
          <Button className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Track
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Track to Playlist</DialogTitle>
            <DialogDescription>
              Search for a track to add to the collaborative playlist
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Search for songs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {mockSearchResults.map((track) => (
                  <button
                    key={track.trackId}
                    onClick={() => handleAddTrack(track)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <img
                      src={track.albumCover}
                      alt={track.trackTitle}
                      className="h-12 w-12 rounded"
                    />
                    <div className="flex-1 text-left">
                      <p className="font-medium">{track.trackTitle}</p>
                      <p className="text-sm text-muted-foreground">{track.trackArtist}</p>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tracks List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Tracks</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {playlist.tracks.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tracks yet. Add some to get started!</p>
            </div>
          ) : (
            <div className="divide-y">
              {playlist.tracks.map((track, index) => (
                <div
                  key={track.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors ${
                    draggedIndex === index ? 'opacity-50' : ''
                  }`}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <span className="text-sm text-muted-foreground w-8">
                    {index + 1}
                  </span>
                  <img
                    src={track.albumCover}
                    alt={track.trackTitle}
                    className="h-12 w-12 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{track.trackTitle}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {track.trackArtist}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage
                        src={track.addedByAvatar}
                        alt={track.addedByName}
                      />
                      <AvatarFallback className="text-xs">
                        {track.addedByName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">
                      {track.addedByName}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveTrack(track.id, track.trackTitle)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
