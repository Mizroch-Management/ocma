import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Save, Copy, Wand2, Instagram, Facebook, Twitter, Linkedin, Youtube } from "lucide-react";

interface PlatformOptimization {
  content?: string;
  hashtags?: string[];
  cta?: string;
}

interface ContentItem {
  title?: string;
  content?: string;
  type?: string;
  aiTool?: string;
  platforms?: string[];
  platformOptimizations?: Record<string, PlatformOptimization>;
  variations?: string[];
  suggestions?: string[];
}

interface ContentEditorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  content: ContentItem | null;
  onSave: (updatedContent: ContentItem) => void;
}

const platforms = [
  { value: "instagram", label: "Instagram", icon: Instagram, color: "text-pink-500" },
  { value: "facebook", label: "Facebook", icon: Facebook, color: "text-blue-600" },
  { value: "twitter", label: "Twitter/X", icon: Twitter, color: "text-sky-500" },
  { value: "linkedin", label: "LinkedIn", icon: Linkedin, color: "text-blue-700" },
  { value: "youtube", label: "YouTube", icon: Youtube, color: "text-red-600" }
];

export function ContentEditorDialog({ isOpen, onOpenChange, content, onSave }: ContentEditorDialogProps) {
  const { toast } = useToast();
  const [editedContent, setEditedContent] = useState<ContentItem>(content || {});

  const handleSave = () => {
    onSave(editedContent);
    toast({
      title: "Content Updated",
      description: "Your content has been saved successfully."
    });
    onOpenChange(false);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to Clipboard",
      description: "Content has been copied to your clipboard."
    });
  };

  const generateVariation = () => {
    // Simulate AI generating a new variation
    const variations = [
      "Here's a fresh take on your content with improved engagement potential!",
      "This variation focuses more on storytelling and emotional connection.",
      "A shorter, punchier version optimized for quick consumption.",
      "This version includes more specific details and actionable insights."
    ];
    
    const newVariation = variations[Math.floor(Math.random() * variations.length)];
    setEditedContent({
      ...editedContent,
      variations: [...(editedContent.variations || []), newVariation]
    });
    
    toast({
      title: "New Variation Generated",
      description: "AI has created a new content variation for you to review."
    });
  };

  if (!content) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Edit Content</DialogTitle>
          <DialogDescription>
            Modify your content and create platform-specific optimizations
          </DialogDescription>
        </DialogHeader>
        
        <div className="h-[70vh] overflow-y-auto pr-4">
          <Tabs defaultValue="main" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="main">Main Content</TabsTrigger>
              <TabsTrigger value="platforms">Platform Optimization</TabsTrigger>
              <TabsTrigger value="variations">Variations</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
            </TabsList>
            
            <TabsContent value="main" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={editedContent.title || ''}
                  onChange={(e) => setEditedContent({ ...editedContent, title: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="content">Content</Label>
                  <Button variant="outline" size="sm" onClick={() => handleCopy(editedContent.content)}>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                </div>
                <Textarea
                  id="content"
                  value={editedContent.content || ''}
                  onChange={(e) => setEditedContent({ ...editedContent, content: e.target.value })}
                  className="min-h-[200px]"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Target Platforms</Label>
                <div className="flex flex-wrap gap-2">
                  {platforms.map((platform) => {
                    const IconComponent = platform.icon;
                    const isSelected = editedContent.platforms?.includes(platform.value);
                    return (
                      <Button
                        key={platform.value}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          const platforms = editedContent.platforms || [];
                          const newPlatforms = isSelected
                            ? platforms.filter((p: string) => p !== platform.value)
                            : [...platforms, platform.value];
                          setEditedContent({ ...editedContent, platforms: newPlatforms });
                        }}
                        className="flex items-center gap-2"
                      >
                        <IconComponent className={`h-4 w-4 ${platform.color}`} />
                        {platform.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="platforms" className="space-y-4">
              {editedContent.platforms?.map((platformId: string) => {
                const platform = platforms.find(p => p.value === platformId);
                if (!platform) return null;
                
                const IconComponent = platform.icon;
                const optimization = editedContent.platformOptimizations?.[platformId] || {};
                
                return (
                  <div key={platformId} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <IconComponent className={`h-5 w-5 ${platform.color}`} />
                      <h3 className="font-semibold">{platform.label} Optimization</h3>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Platform-specific content</Label>
                      <Textarea
                        value={optimization.content || editedContent.content || ''}
                        onChange={(e) => {
                          const newOptimizations = {
                            ...editedContent.platformOptimizations,
                            [platformId]: {
                              ...optimization,
                              content: e.target.value
                            }
                          };
                          setEditedContent({ ...editedContent, platformOptimizations: newOptimizations });
                        }}
                        className="min-h-[100px]"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Hashtags</Label>
                        <Input
                          value={optimization.hashtags?.join(' ') || ''}
                          onChange={(e) => {
                            const hashtags = e.target.value.split(' ').filter(tag => tag.trim());
                            const newOptimizations = {
                              ...editedContent.platformOptimizations,
                              [platformId]: {
                                ...optimization,
                                hashtags
                              }
                            };
                            setEditedContent({ ...editedContent, platformOptimizations: newOptimizations });
                          }}
                          placeholder="#hashtag1 #hashtag2"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Call to Action</Label>
                        <Input
                          value={optimization.cta || ''}
                          onChange={(e) => {
                            const newOptimizations = {
                              ...editedContent.platformOptimizations,
                              [platformId]: {
                                ...optimization,
                                cta: e.target.value
                              }
                            };
                            setEditedContent({ ...editedContent, platformOptimizations: newOptimizations });
                          }}
                          placeholder="Learn more, Shop now, etc."
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </TabsContent>
            
            <TabsContent value="variations" className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Content Variations</Label>
                <Button variant="outline" size="sm" onClick={generateVariation}>
                  <Wand2 className="h-4 w-4 mr-1" />
                  Generate New
                </Button>
              </div>
              
              {editedContent.variations?.map((variation: string, index: number) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Variation {index + 1}</Label>
                    <Button variant="ghost" size="sm" onClick={() => handleCopy(variation)}>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <Textarea
                    value={variation}
                    onChange={(e) => {
                      const newVariations = [...(editedContent.variations || [])];
                      newVariations[index] = e.target.value;
                      setEditedContent({ ...editedContent, variations: newVariations });
                    }}
                    className="min-h-[100px]"
                  />
                </div>
              ))}
              
              {(!editedContent.variations || editedContent.variations.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No variations yet. Click "Generate New" to create content variations.</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="metadata" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Content Type</Label>
                  <Badge variant="outline">{editedContent.type || 'Social Post'}</Badge>
                </div>
                
                <div className="space-y-2">
                  <Label>AI Tool Used</Label>
                  <Badge variant="outline">{editedContent.aiTool || 'GPT-4'}</Badge>
                </div>
                
                <div className="space-y-2">
                  <Label>Word Count</Label>
                  <p className="text-sm">{editedContent.content?.split(' ').length || 0} words</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Character Count</Label>
                  <p className="text-sm">{editedContent.content?.length || 0} characters</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>AI Suggestions</Label>
                <div className="space-y-1">
                  {editedContent.suggestions?.map((suggestion: string, index: number) => (
                    <p key={index} className="text-sm text-muted-foreground">• {suggestion}</p>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}