import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Plus, Music, Globe, Lock, Users, Edit2, Eye } from "lucide-react";
import { CreateListModal } from "./CreateListModal";
import { EditListModal } from "./EditListModal";
import { ViewListPage } from "./ViewListPage";
import { useLists } from "../lib/ListsContext";

interface ListsPageProps {
  onNavigate?: (page: string) => void;
  onOpenAlbum?: (albumId?: string) => void;
}

export function ListsPage({ onNavigate, onOpenAlbum }: ListsPageProps) {
  const { userListsMetadata, createList, updateList, deleteList } = useLists();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewingListId, setViewingListId] = useState<string | null>(null);
  const [editingList, setEditingList] = useState<{
    id: string;
    title: string;
    description: string;
    visibility: "public" | "private" | "friends";
    songs: any[];
  } | null>(null);

  // Get user-created lists
  const allLists = Object.entries(userListsMetadata).map(([id, list]) => ({
    id,
    title: list.title,
    description: list.description || "",
    visibility: list.visibility,
    albumCount: list.albumCount,
    songCount: list.songCount || 0,
    coverImages: list.coverImages,
    isUserCreated: true,
  }));

  const handleEditList = (listId: string) => {
    const userList = userListsMetadata[listId];
    if (userList) {
      setEditingList({
        id: listId,
        title: userList.title,
        description: userList.description || "",
        visibility: userList.visibility,
        songs: userList.songs || [],
      });
      setEditModalOpen(true);
    }
  };

  const handleViewList = (listId: string) => {
    console.log("Viewing list:", listId);
    setViewingListId(listId);
  };

  const handleBackToLists = () => {
    console.log("Going back to lists");
    setViewingListId(null);
  };

  const handleDeleteList = async (listId: string) => {
    try {
      await deleteList(listId);
      setViewingListId(null);
    } catch (error) {
      console.error("Error deleting list:", error);
    }
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case "private":
        return Lock;
      case "friends":
        return Users;
      default:
        return Globe;
    }
  };

  const getVisibilityLabel = (visibility: string) => {
    switch (visibility) {
      case "private":
        return "Private";
      case "friends":
        return "Friends";
      default:
        return "Public";
    }
  };

  // If viewing a specific list, show the ViewListPage
  if (viewingListId) {
    return (
      <ViewListPage
        listId={viewingListId}
        onBack={handleBackToLists}
        onEdit={handleEditList}
        onDelete={handleDeleteList}
        onOpenAlbum={onOpenAlbum}
      />
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-2">Your Lists</h1>
          <p className="text-muted-foreground">
            Organize your favorite albums and songs into collections
          </p>
        </div>
        <Button
          onClick={() => setCreateModalOpen(true)}
          className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg hidden md:flex"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create New List
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card key="total-lists-stat" className="p-4 bg-card/50 border-border text-center">
          <p className="text-2xl text-primary mb-1">{allLists.length}</p>
          <p className="text-sm text-muted-foreground">Total Lists</p>
        </Card>
        <Card key="albums-stat" className="p-4 bg-card/50 border-border text-center">
          <p className="text-2xl text-secondary mb-1">
            {allLists.reduce((sum, list) => sum + list.albumCount, 0)}
          </p>
          <p className="text-sm text-muted-foreground">Albums</p>
        </Card>
        <Card key="songs-stat" className="p-4 bg-card/50 border-border text-center">
          <p className="text-2xl text-accent mb-1">
            {allLists.reduce((sum, list) => sum + list.songCount, 0)}
          </p>
          <p className="text-sm text-muted-foreground">Songs</p>
        </Card>
        <Card key="public-lists-stat" className="p-4 bg-card/50 border-border text-center">
          <p className="text-2xl text-chart-3 mb-1">
            {Object.values(userListsMetadata).filter(l => l.visibility === "public").length}
          </p>
          <p className="text-sm text-muted-foreground">Public</p>
        </Card>
      </div>

      {/* Lists Grid */}
      {allLists.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {allLists.map((list) => {
            const VisibilityIcon = getVisibilityIcon(list.visibility);
            const totalItems = list.albumCount + list.songCount;
            
            return (
              <Card
                key={list.id}
                className="group bg-card border-border hover:border-primary/50 transition-all shadow-soft hover:shadow-medium overflow-hidden"
              >
                {/* Cover Collage */}
                <div className="relative h-48 overflow-hidden bg-muted/20">
                  {list.coverImages.length >= 3 ? (
                    <div className="grid grid-cols-3 gap-1 h-full">
                      {list.coverImages.slice(0, 3).map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ))}
                    </div>
                  ) : list.coverImages.length > 0 ? (
                    <img
                      src={list.coverImages[0]}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gradient-to-br from-primary/20 to-accent/20">
                      <Music className="w-16 h-16 text-primary/40" />
                    </div>
                  )}
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  
                  {/* Visibility Badge */}
                  <Badge className="absolute top-3 right-3 bg-background/90 border-border text-foreground backdrop-blur-sm">
                    <VisibilityIcon className="w-3 h-3 mr-1" />
                    {getVisibilityLabel(list.visibility)}
                  </Badge>
                </div>

                {/* List Info */}
                <div className="p-5 space-y-3">
                  <div>
                    <h3 className="text-foreground mb-1 group-hover:text-primary transition-colors line-clamp-1">
                      {list.title}
                    </h3>
                    {list.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                        {list.description}
                      </p>
                    )}
                  </div>

                  {/* Item Count */}
                  <div className="flex items-center gap-4 text-sm">
                    {list.albumCount > 0 && (
                      <div className="flex items-center gap-1.5 text-primary">
                        <Music className="w-4 h-4" />
                        <span>{list.albumCount} {list.albumCount === 1 ? 'album' : 'albums'}</span>
                      </div>
                    )}
                    {list.songCount > 0 && (
                      <div className="flex items-center gap-1.5 text-secondary">
                        <Music className="w-4 h-4" />
                        <span>{list.songCount} {list.songCount === 1 ? 'song' : 'songs'}</span>
                      </div>
                    )}
                    {totalItems === 0 && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Music className="w-4 h-4" />
                        <span>Empty list</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    {list.isUserCreated && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-border hover:border-primary hover:text-primary"
                        onClick={() => handleEditList(list.id)}
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                        Edit
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className={`${list.isUserCreated ? 'flex-1' : 'w-full'} bg-primary hover:bg-primary/90 text-primary-foreground`}
                      onClick={() => handleViewList(list.id)}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      View
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <Card className="p-12 bg-card border-border text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Music className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h3 className="text-lg text-foreground mb-2">No Lists Yet</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Create your first list to organize your favorite albums and songs
              </p>
              <Button
                onClick={() => setCreateModalOpen(true)}
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First List
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Floating Create Button (Mobile) */}
      <Button
        onClick={() => setCreateModalOpen(true)}
        className="md:hidden fixed bottom-20 right-4 w-14 h-14 rounded-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground shadow-lg shadow-primary/30 z-10 p-0"
      >
        <Plus className="w-6 h-6" />
      </Button>

      {/* Create List Modal */}
      <CreateListModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreateList={async (listData) => {
          try {
            await createList({
              title: listData.title,
              description: listData.description,
              visibility: listData.visibility,
              albums: listData.albums || [],
              songs: listData.songs || [],
            });
          } catch (error) {
            console.error("Error creating list:", error);
          }
        }}
      />

      {/* Edit List Modal */}
      {editModalOpen && editingList && (
        <EditListModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setEditingList(null);
          }}
          listId={editingList.id}
          initialTitle={editingList.title}
          initialDescription={editingList.description}
          initialVisibility={editingList.visibility}
          initialSongs={editingList.songs}
          onDeleteList={async () => {
            try {
              await deleteList(editingList.id);
              setEditModalOpen(false);
              setEditingList(null);
            } catch (error) {
              console.error("Error deleting list:", error);
            }
          }}
          onUpdateList={async (listData) => {
            try {
              await updateList({
                id: editingList.id,
                title: listData.title,
                description: listData.description,
                visibility: listData.visibility,
                albums: listData.albums || [],
                songs: listData.songs || [],
              });
            } catch (error) {
              console.error("Error updating list:", error);
            }
          }}
        />
      )}
    </div>
  );
}