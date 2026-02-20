"use client";

import Image from "next/image";
import { useState } from "react";

interface AvatarProps {
    src?: string | null;
    name?: string | null;
    size?: number; // px
    className?: string;
    style?: React.CSSProperties;
    /** Extra classes for the inner text fallback */
    textClassName?: string;
}

/**
 * A robust Avatar component that:
 * 1. Shows the profile image when available (with an onError fallback).
 * 2. Falls back to a gradient initial-letter div when there's no image or it fails to load.
 */
export default function Avatar({
    src,
    name,
    size = 40,
    className = "",
    style = {},
    textClassName = "",
}: AvatarProps) {
    const [imgError, setImgError] = useState(false);

    const showImage = src && src.trim() !== "" && !imgError;
    const initial = name?.trim()?.[0]?.toUpperCase() ?? "?";

    const fontSize = size <= 32 ? "text-xs" : size <= 48 ? "text-sm" : size <= 72 ? "text-xl" : "text-3xl";

    return (
        <div
            className={`relative overflow-hidden rounded-full flex-shrink-0 ${className}`}
            style={{ width: size, height: size, ...style }}
        >
            {showImage ? (
                <Image
                    src={src!}
                    alt={name ?? "avatar"}
                    fill
                    className="object-cover"
                    unoptimized
                    onError={() => setImgError(true)}
                />
            ) : (
                <div
                    className={`w-full h-full flex items-center justify-center font-black ${fontSize} ${textClassName}`}
                    style={{
                        background: "linear-gradient(135deg, #19E3D1, #00C2FF)",
                        color: "#0B0F14",
                    }}
                >
                    {initial}
                </div>
            )}
        </div>
    );
}
