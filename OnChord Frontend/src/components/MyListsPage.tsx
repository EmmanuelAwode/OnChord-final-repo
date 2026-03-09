import { useMemo } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Plus, Music, Lock, Globe } from "lucide-react";
import { BackButton } from "./BackButton";
import { useLists } from "../lib/ListsContext";

interface MyListsPageProps {
  onNavigate?: (page: string) => void;
  onBack?: () => void;
  canGoBack?: boolean;
}

export function MyListsPage({ onNavigate, onBack, canGoBack }: MyListsPageProps) {
  const { userListsMetadata } = useLists();
  
  // Convert lists metadata to array
  const myLists = useMemo(() => Object.values(userListsMetadata), [userListsMetadata]);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <BackButton onClick={onBack || (() => onNavigate?.("your-space"))} label={canGoBack ? "Back" : "Back to My Space"} />
        <div className="flex-1">
          <h1 className="mb-2">My Lists</h1>
          <p className="text-muted-foreground">
            Curated collections of your favorite albums
          </p>
        </div>
        <Button
          className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-md"
        >
          <Plus className="w-4 h-4 mr-2" />
          New List
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card key="total-lists-stat" className="p-4 bg-card border-border text-center">
          <p className="text-2xl text-primary mb-1">{myLists.length}</p>
          <p className="text-sm text-muted-foreground">Total Lists</p>
        </Card>
        <Card key="total-albums-stat" className="p-4 bg-card border-border text-center">
          <p className="text-2xl text-secondary mb-1">
            {myLists.reduce((acc, list) => acc + list.albumCount, 0)}
          </p>
          <p className="text-sm text-muted-foreground">Total Albums</p>
        </Card>
        <Card key="avg-per-list-stat" className="p-4 bg-card border-border text-center col-span-2 md:col-span-1">
          <p className="text-2xl text-accent mb-1">
            {Math.round(myLists.reduce((acc, list) => acc + list.albumCount, 0) / myLists.length)}
          </p>
          <p className="text-sm text-muted-foreground">Avg per List</p>
        </Card>
      </div>

      {/* Lists Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {myLists.map((list) => (
          <Card 
            key={list.id} 
            className="p-6 bg-card border-border hover:border-primary/50 transition-all cursor-pointer group shadow-soft hover:shadow-medium"
          >
            {/* List Cover Grid */}
            <div className="grid grid-cols-2 gap-2 mb-4 rounded-lg overflow-hidden">
              {list.coverImages.slice(0, 4).map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt=""
                  className="w-full h-32 object-cover group-hover:scale-105 transition-transform"
                />
              ))}
            </div>

            {/* List Info */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-foreground group-hover:text-primary transition">
                  {list.title}
                </h3>
                <Badge variant="outline" className="border-primary/30 text-primary flex-shrink-0">
                  <Globe className="w-3 h-3 mr-1" />
                  Public
                </Badge>
              </div>
              
              <p className="text-sm text-muted-foreground line-clamp-2">
                {list.description}
              </p>
              
              <div className="flex items-center gap-2 pt-2">
                <Music className="w-4 h-4 text-primary" />
                <span className="text-sm text-primary">{list.albumCount} albums</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4">
              <Button 
                size="sm" 
                variant="outline"
                className="flex-1 border-border hover:border-primary hover:text-primary"
              >
                Edit
              </Button>
              <Button 
                size="sm"
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                View
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State for no lists */}
      {myLists.length === 0 && (
        <Card className="p-12 bg-card border-border text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Music className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-foreground mb-2">No Lists Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start organizing your favorite albums into curated collections
              </p>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First List
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
