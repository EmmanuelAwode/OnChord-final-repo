import { useState, useRef } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Music,
  Disc,
  Globe,
  Lock,
  Users,
  Calendar,
  Clock,
  Play,
  ImagePlus,
} from "lucide-react";
import { useLists } from "../lib/ListsContext";
import { toast } from "sonner@2.0.3";

interface ViewListPageProps {
  listId: string;
  onBack: () => void;
  onEdit: (listId: string) => void;
  onDelete: (listId: string) => void;
  onOpenAlbum?: (albumId?: string) => void;
}

export function ViewListPage({
  listId,
  onBack,
  onEdit,
  onDelete,
  onOpenAlbum,
}: ViewListPageProps) {
  const { userListsMetadata, updateListCover } = useLists();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get user list
  const list = userListsMetadata[listId];

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Convert to base64 for local storage
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        updateListCover(listId, base64);
        toast.success("Cover image updated!");
      };
      reader.readAsDataURL(file);
    }
  };

  if (!list) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 bg-card border-border text-center">
          <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">List not found</p>
          <Button
            onClick={onBack}
            variant="outline"
            className="mt-4 border-border hover:border-primary hover:text-primary"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Lists
          </Button>
        </Card>
      </div>
    );
  }

  // Get list items from user list
  const displayAlbums = list?.albums || [];
  const displaySongs = list?.songs || [];
  
  const totalItems = displayAlbums.length + displaySongs.length;
  const isUserList = !!list;

  const getVisibilityIcon = () => {
    const visibility = list?.visibility || "public";
    switch (visibility) {
      case "private":
        return Lock;
      case "friends":
        return Users;
      default:
        return Globe;
    }
  };

  const getVisibilityLabel = () => {
    const visibility = list?.visibility || "public";
    switch (visibility) {
      case "private":
        return "Private";
      case "friends":
        return "Friends Only";
      default:
        return "Public";
    }
  };

  const VisibilityIcon = getVisibilityIcon();

  const handleDeleteConfirm = () => {
    onDelete(listId);
    toast.success(`Deleted "${list.title}"`);
    setDeleteDialogOpen(false);
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="hover:bg-primary/10 flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="truncate">{list.title}</h1>
        </div>
      </div>

      {/* List Header Card */}
      <Card className="overflow-hidden bg-card border-border shadow-medium">
        {/* Cover Image */}
        <div className="relative h-64 md:h-80 overflow-hidden bg-muted/20">
          {/* Hidden file input for cover image */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverImageChange}
            className="hidden"
          />
          
          {/* Display custom cover if set, otherwise use song covers or default */}
          {list.customCover ? (
            <img
              src={list.customCover}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : list.coverImages && list.coverImages.length >= 3 ? (
            <div className="grid grid-cols-3 gap-1 h-full">
              {list.coverImages.slice(0, 3).map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ))}
            </div>
          ) : list.coverImages && list.coverImages.length > 0 ? (
            <img
              src={list.coverImages[0]}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-primary/20 to-accent/20">
              <Music className="w-24 h-24 text-primary/40" />
            </div>
          )}
          
          {/* Change Cover Button */}
          {isUserList && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white border-0"
            >
              <ImagePlus className="w-4 h-4 mr-2" />
              Change Cover
            </Button>
          )}
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

          {/* Title and Meta Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-white text-2xl md:text-3xl mb-2">
                  {list.title}
                </h2>
                {list.description && (
                  <p className="text-white/90 text-sm md:text-base line-clamp-2">
                    {list.description}
                  </p>
                )}
              </div>
              <Badge className="bg-white/90 text-foreground border-0 flex-shrink-0">
                <VisibilityIcon className="w-3 h-3 mr-1" />
                {getVisibilityLabel()}
              </Badge>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-4 text-white/90 text-sm">
              {displayAlbums.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Disc className="w-4 h-4" />
                  <span>{displayAlbums.length} {displayAlbums.length === 1 ? 'album' : 'albums'}</span>
                </div>
              )}
              {displaySongs.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Music className="w-4 h-4" />
                  <span>{displaySongs.length} {displaySongs.length === 1 ? 'song' : 'songs'}</span>
                </div>
              )}
              {totalItems === 0 && (
                <div className="flex items-center gap-1.5">
                  <Music className="w-4 h-4" />
                  <span>Empty list</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {isUserList && (
          <div className="p-6 border-t border-border bg-card/50 flex gap-3">
            <Button
              onClick={() => onEdit(listId)}
              variant="outline"
              className="flex-1 border-border hover:border-primary hover:text-primary"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit List
            </Button>
            <Button
              onClick={() => setDeleteDialogOpen(true)}
              variant="outline"
              className="flex-1 border-border hover:border-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete List
            </Button>
          </div>
        )}
      </Card>

      {/* List Content */}
      {totalItems > 0 ? (
        <div className="space-y-6">
          {/* Albums Section */}
          {displayAlbums.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Disc className="w-5 h-5 text-primary" />
                <h3 className="text-foreground">
                  Albums ({displayAlbums.length})
                </h3>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {displayAlbums.map((album: any) => (
                  <Card
                    key={album.id}
                    className="group bg-card border-border hover:border-primary/50 transition-all shadow-soft hover:shadow-medium cursor-pointer overflow-hidden"
                    onClick={() => onOpenAlbum?.(album.id)}
                  >
                    {/* Album Cover */}
                    <div className="relative aspect-square overflow-hidden bg-muted">
                      <img
                        src={album.cover}
                        alt={album.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {/* Play Overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                          <Play className="w-5 h-5 text-white ml-0.5" />
                        </div>
                      </div>
                    </div>

                    {/* Album Info */}
                    <div className="p-4 space-y-2">
                      <div>
                        <h4 className="text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {album.title}
                        </h4>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {album.artist}
                        </p>
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {album.year && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {album.year}
                          </div>
                        )}
                        {album.genre && (
                          <Badge className="bg-primary/15 text-primary border-0 text-xs px-2 py-0">
                            {album.genre}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Songs Section */}
          {displaySongs.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Music className="w-5 h-5 text-secondary" />
                <h3 className="text-foreground">
                  Songs ({displaySongs.length})
                </h3>
              </div>
              <Card className="bg-card border-border divide-y divide-border overflow-hidden">
                {displaySongs.map((song: any, index: number) => (
                  <div
                    key={song.id}
                    className="group p-4 hover:bg-muted/20 transition-colors cursor-pointer flex items-center gap-4"
                  >
                    {/* Index */}
                    <div className="w-6 text-center text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0">
                      <span className="group-hover:hidden">{index + 1}</span>
                      <Play className="w-4 h-4 hidden group-hover:block mx-auto" />
                    </div>

                    {/* Song Cover */}
                    <img
                      src={song.cover}
                      alt={song.title}
                      className="w-12 h-12 rounded object-cover shadow-sm flex-shrink-0"
                    />

                    {/* Song Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-foreground group-hover:text-primary transition-colors truncate">
                        {song.title}
                      </h4>
                      <p className="text-sm text-muted-foreground truncate">
                        {song.artist}
                      </p>
                    </div>

                    {/* Album Name */}
                    <div className="hidden md:block flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground truncate">
                        {song.album}
                      </p>
                    </div>

                    {/* Duration */}
                    <div className="flex items-center gap-1 text-sm text-muted-foreground flex-shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                      {song.duration}
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <Card className="p-12 bg-card border-border text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Music className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h3 className="text-lg text-foreground mb-2">No Songs Yet</h3>
              <p className="text-sm text-muted-foreground mb-6">
                {isUserList
                  ? "Add songs to start building your playlist"
                  : "This list doesn't have any songs yet"}
              </p>
              {isUserList && (
                <Button
                  onClick={() => onEdit(listId)}
                  className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg"
                >
                  <Music className="w-4 h-4 mr-2" />
                  Add Songs
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              Delete "{list.title}"?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This action cannot be undone. This will permanently delete your
              list and remove all items from it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border hover:bg-muted">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Delete List
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}