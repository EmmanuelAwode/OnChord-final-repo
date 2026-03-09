import { useEffect, useState } from 'react';
import { Radio, Heart, Music, UserPlus, RefreshCw, Users } from 'lucide-react';
import { useRealtimeActivity } from '../lib/useRealtimeActivity';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { StarRating } from './StarRating';
import { handleImageError } from './ui/utils';

export default function ActivityFeed() {
  const { activities, liveListeners, isLoading, error, broadcastListening, reload } =
    useRealtimeActivity();
  
  const [showLiveOnly, setShowLiveOnly] = useState(false);

  const displayedActivities = showLiveOnly
    ? activities.filter((a) => a.isLive)
    : activities;

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'listening':
        return <Radio className="h-4 w-4 text-green-500 animate-pulse" />;
      case 'review':
        return <Music className="h-4 w-4 text-blue-500" />;
      case 'like':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'follow':
        return <UserPlus className="h-4 w-4 text-purple-500" />;
      case 'playlist_add':
        return <Music className="h-4 w-4 text-yellow-500" />;
      default:
        return <Music className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityText = (activity: any) => {
    switch (activity.type) {
      case 'listening':
        return (
          <>
            <span className="font-semibold">{activity.userName}</span> is listening to{' '}
            <span className="font-medium">{activity.trackTitle}</span>
            {activity.albumArtist && ` by ${activity.albumArtist}`}
          </>
        );
      case 'review':
        return (
          <>
            <span className="font-semibold">{activity.userName}</span> reviewed{' '}
            <span className="font-medium">{activity.albumTitle}</span>
            {activity.albumArtist && ` by ${activity.albumArtist}`}
          </>
        );
      case 'like':
        return (
          <>
            <span className="font-semibold">{activity.userName}</span> liked{' '}
            <span className="font-medium">{activity.albumTitle}</span>
          </>
        );
      case 'follow':
        return (
          <>
            <span className="font-semibold">{activity.userName}</span> {activity.action}
          </>
        );
      case 'playlist_add':
        return (
          <>
            <span className="font-semibold">{activity.userName}</span> added a track to
            their playlist
          </>
        );
      default:
        return (
          <>
            <span className="font-semibold">{activity.userName}</span> {activity.action}
          </>
        );
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">Activity Feed</h2>
          {liveListeners.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Radio className="h-3 w-3 animate-pulse" />
              {liveListeners.length} live
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLiveOnly(!showLiveOnly)}
          >
            {showLiveOnly ? 'Show all' : 'Live only'}
          </Button>
          <Button variant="ghost" size="icon" onClick={reload}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Live Listeners Section */}
      {liveListeners.length > 0 && (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Radio className="h-4 w-4 text-green-500 animate-pulse" />
              <h3 className="font-semibold text-sm">Listening Now</h3>
            </div>
            <div className="space-y-3">
              {liveListeners.map((listener) => (
                <div key={listener.id} className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={listener.userAvatar} alt={listener.userName} />
                    <AvatarFallback>{listener.userName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-semibold">{listener.userName}</span>
                      <span className="text-muted-foreground"> is listening to</span>
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {listener.albumCover && (
                        <img
                          src={listener.albumCover}
                          alt="Album cover"
                          onError={handleImageError}
                          className="h-8 w-8 rounded"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">
                          {listener.trackTitle}
                        </p>
                        {listener.albumArtist && (
                          <p className="text-xs text-muted-foreground truncate">
                            {listener.albumArtist}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Live
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity List */}
      <Card>
        <ScrollArea className="h-[600px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Failed to load activity feed
            </div>
          ) : displayedActivities.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">
                {showLiveOnly ? 'No one is listening right now' : 'No activity yet'}
              </p>
              <p className="text-xs text-muted-foreground">
                {showLiveOnly
                  ? 'Check back later to see what your friends are listening to'
                  : 'Connect with friends to see their music activity'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {displayedActivities.map((activity) => (
                <div key={activity.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={activity.userAvatar} alt={activity.userName} />
                      <AvatarFallback>{activity.userName.charAt(0)}</AvatarFallback>
                    </Avatar>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getActivityIcon(activity.type)}
                        <p className="text-sm">{getActivityText(activity)}</p>
                      </div>

                      {/* Album/Track Card */}
                      {(activity.albumCover || activity.trackTitle) && (
                        <div className="mt-2 flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                          {activity.albumCover && (
                            <img
                              src={activity.albumCover}
                              alt="Album cover"
                              onError={handleImageError}
                              className="h-12 w-12 rounded"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            {activity.albumTitle && (
                              <p className="text-sm font-medium truncate">
                                {activity.albumTitle}
                              </p>
                            )}
                            {activity.trackTitle && (
                              <p className="text-sm font-medium truncate">
                                {activity.trackTitle}
                              </p>
                            )}
                            {activity.albumArtist && (
                              <p className="text-xs text-muted-foreground truncate">
                                {activity.albumArtist}
                              </p>
                            )}
                            {activity.rating && (
                              <div className="mt-1">
                                <StarRating
                                  rating={activity.rating}
                                  onRatingChange={() => {}}
                                  interactive={false}
                                  size="sm"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Timestamp */}
                      <div className="flex items-center gap-2 mt-2">
                        <p className="text-xs text-muted-foreground">
                          {activity.timestamp}
                        </p>
                        {activity.isLive && (
                          <Badge variant="outline" className="text-xs">
                            Live
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </Card>
    </div>
  );
}
