import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GiftCardForm } from "@/components/sites/GiftCardForm";
import { db } from "@/lib/db";
import { getPublishedSite } from "@/lib/sites/repo";

type Params = { params: Promise<{ site: string }>; searchParams: Promise<{ paid?: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { site: slug } = await params;
  const sql = db();
  const site = sql ? await getPublishedSite(sql, slug) : null;
  return site ? { title: `Gift cards | ${site.content.brand.name}`, alternates: { canonical: `/s/${site.slug}/gift-cards` } } : {};
}

export default async function GiftCards({ params, searchParams }: Params) {
  const { site: slug } = await params;
  const { paid } = await searchParams;
  const sql = db();
  const site = sql ? await getPublishedSite(sql, slug) : null;
  if (!site) notFound();
  const online = Boolean(process.env.STRIPE_SECRET_KEY?.trim());
  return (
    <div className="site-wrap site-book">
      <div className="head">
        <p className="site-eyebrow">Gift cards</p>
        <h1>Give them a night at {site.content.brand.name}.</h1>
        <p style={{ marginTop: 18 }}>Any amount from $10 to $500, emailed straight away, good across as many visits as it takes.</p>
      </div>
      {paid ? (
        <div className="site-panel"><h2 style={{ fontSize: 26 }}>Thank you.</h2><p className="site-note">Your payment went through. The gift card code is on its way by email.</p></div>
      ) : online ? (
        <GiftCardForm slug={site.slug} />
      ) : (
        <div className="site-panel"><p>Gift cards are sold at the restaurant for now — ask your server, or call {site.content.contact.phone || "us"}.</p></div>
      )}
    </div>
  );
}
