"use client";

import {useState, useEffect, useCallback} from "react";
import Image from "next/image";
import {Dialog, DialogContent, DialogTitle} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {
    ChevronLeft,
    ChevronRight,
    X,
    ZoomIn,
    Download,
    ImageIcon,
} from "lucide-react";
import {cn} from "@/lib/utils";

export function PhotoGallery({
                                 photos,
                                 columns = 3,
                                 className,
                                 renderTrigger,
                             }) {
    const [open, setOpen] = useState(false);
    const [current, setCurrent] = useState(0);

    const colClass = {
        2: "grid-cols-2",
        3: "grid-cols-2 sm:grid-cols-3",
        4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
    }[columns];

    const openPhoto = (index) => {
        setCurrent(index);
        setOpen(true);
    };

    const prev = useCallback(() => {
        setCurrent((c) => (c - 1 + photos.length) % photos.length);
    }, [photos.length]);

    const next = useCallback(() => {
        setCurrent((c) => (c + 1) % photos.length);
    }, [photos.length]);

    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (e.key === "ArrowLeft") prev();
            if (e.key === "ArrowRight") next();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, prev, next]);

    const photo = photos[current];

    if (photos.length === 0) {
        if (renderTrigger) return renderTrigger(() => {});
        return (
            <div
                className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-12 text-muted-foreground">
                <ImageIcon className="h-8 w-8 opacity-40"/>
                <p className="text-sm">Chưa có ảnh nào</p>
            </div>
        );
    }

    const gridContent = (
            <div className={cn("grid gap-2", colClass, className)}>
                {photos.map((p, i) => (
                    <button
                        key={p.id}
                        onClick={() => openPhoto(i)}
                        className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <Image
                            src={p.thumb ?? p.src}
                            alt={p.alt}
                            fill
                            className="object-cover transition-transform duration-200 group-hover:scale-105"
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />
                        {/* hover overlay */}
                        <div
                            className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/30">
                            <ZoomIn
                                className="h-6 w-6 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100"/>
                        </div>
                        {/* label */}
                        {p.label && (
                            <div
                                className="absolute bottom-0 left-0 right-0 translate-y-full bg-gradient-to-t from-black/60 to-transparent px-2 pb-1.5 pt-4 transition-transform duration-200 group-hover:translate-y-0">
                                <p className="truncate text-xs text-white">{p.label}</p>
                            </div>
                        )}
                    </button>
                ))}
            </div>
    );

    return (
        <>
            {renderTrigger ? renderTrigger(openPhoto) : gridContent}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent
                    className="max-w-4xl gap-0 border-0 bg-black/95 p-0 text-white shadow-none [&>button]:hidden"
                    aria-label="Xem ảnh"
                >
                    <DialogTitle className="sr-only">{photo?.label || photo?.alt || "Xem ảnh"}</DialogTitle>
                    {/* top bar */}
                    <div className="flex items-center justify-between px-4 py-3">
                        <Badge variant="secondary" className="bg-white/10 text-white hover:bg-white/10">
                            {current + 1} / {photos.length}
                        </Badge>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-white hover:bg-white/10"
                                asChild
                            >
                                <a href={photo.src} download target="_blank" rel="noreferrer" aria-label="Tải ảnh">
                                    <Download className="h-4 w-4"/>
                                </a>
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-white hover:bg-white/10"
                                onClick={() => setOpen(false)}
                                aria-label="Đóng"
                            >
                                <X className="h-4 w-4"/>
                            </Button>
                        </div>
                    </div>

                    {/* image area */}
                    <div className="relative flex items-center justify-center px-12 py-2">
                        {/* prev */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute left-1 z-10 h-10 w-10 rounded-full text-white hover:bg-white/10 disabled:opacity-30"
                            onClick={prev}
                            disabled={photos.length <= 1}
                            aria-label="Ảnh trước"
                        >
                            <ChevronLeft className="h-5 w-5"/>
                        </Button>

                        <div className="relative h-[60vh] w-full">
                            <Image
                                key={photo.id}
                                src={photo.src}
                                alt={photo.alt}
                                fill
                                className="object-contain"
                                sizes="90vw"
                                priority
                            />
                        </div>

                        {/* next */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 z-10 h-10 w-10 rounded-full text-white hover:bg-white/10 disabled:opacity-30"
                            onClick={next}
                            disabled={photos.length <= 1}
                            aria-label="Ảnh tiếp"
                        >
                            <ChevronRight className="h-5 w-5"/>
                        </Button>
                    </div>

                    {/* caption */}
                    {(photo.label || photo.caption) && (
                        <div className="px-6 py-3 text-center">
                            {photo.label && (
                                <p className="text-sm font-medium text-white">{photo.label}</p>
                            )}
                            {photo.caption && (
                                <p className="mt-0.5 text-xs text-white/60">{photo.caption}</p>
                            )}
                        </div>
                    )}

                    {/* thumbnail strip */}
                    {photos.length > 1 && (
                        <div className="flex gap-1.5 overflow-x-auto px-4 pb-4 pt-2 scrollbar-thin">
                            {photos.map((p, i) => (
                                <button
                                    key={p.id}
                                    onClick={() => setCurrent(i)}
                                    className={cn(
                                        "relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border-2 transition-all",
                                        i === current
                                            ? "border-white opacity-100"
                                            : "border-transparent opacity-50 hover:opacity-80"
                                    )}
                                    aria-label={`Xem ảnh ${i + 1}`}
                                >
                                    <Image
                                        src={p.thumb ?? p.src}
                                        alt={p.alt}
                                        fill
                                        className="object-cover"
                                        sizes="48px"
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
