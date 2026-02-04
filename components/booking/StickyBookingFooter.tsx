"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
import { BookingModal } from "./BookingModal";

export function StickyBookingFooter() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handler = () => setOpen(true);
    document.addEventListener("open-booking-modal", handler);
    return () => document.removeEventListener("open-booking-modal", handler);
  }, []);

  const openModal = () => setOpen(true);
  const closeModal = () => setOpen(false);

  if (!mounted) return null;

  return (
    <>
      <motion.footer
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.5 }}
        className="fixed bottom-0 left-0 right-0 z-40 flex justify-center p-4 md:hidden"
      >
        <button
          type="button"
          onClick={openModal}
          className="flex w-full max-w-sm items-center justify-center gap-2 rounded-full bg-[#1A3C34] py-3.5 text-base font-medium text-[#F9F7F2] shadow-[0_4px_14px_rgba(26,60,52,0.3)] active:opacity-90"
        >
          <Calendar size={20} />
          Book Appointment
        </button>
      </motion.footer>
      <BookingModal isOpen={open} onClose={closeModal} />
    </>
  );
}
