"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";

const TREATMENTS = [
  { id: "botox", label: "Botox" },
  { id: "filler", label: "Filler" },
  { id: "laser", label: "Laser" },
];

const WEBHOOK_URL = "[INSERT_YOUR_WEBHOOK_HERE]";

export interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BookingModal({ isOpen, onClose }: BookingModalProps) {
  const [step, setStep] = useState(1);
  const [treatment, setTreatment] = useState("");
  const [date, setDate] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const reset = () => {
    setStep(1);
    setTreatment("");
    setDate("");
    setEmail("");
    setPhone("");
    setDone(false);
  };

  const handleClose = () => {
    onClose();
    setTimeout(reset, 300);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (WEBHOOK_URL.startsWith("[INSERT")) {
        console.log("Booking payload:", {
          treatment,
          date,
          email,
          phone,
        });
        setDone(true);
        return;
      }
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ treatment, date, email, phone }),
      });
      if (!res.ok) throw new Error("Webhook failed");
      setDone(true);
    } catch (e) {
      console.error(e);
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", damping: 25 }}
          className="relative w-full max-w-md rounded-2xl bg-[#F9F7F2] shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-4 top-4 rounded-full p-1 text-[#1A3C34]/70 hover:bg-[#D4DCD6]/50"
            aria-label="Close"
          >
            <X size={20} />
          </button>

          <div className="p-6 pt-10">
            {done ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-8 text-center"
              >
                <p className="text-lg font-medium text-[#1A3C34]">
                  Thank you. We&apos;ll be in touch shortly to confirm your
                  appointment.
                </p>
                <Button
                  variant="primary"
                  className="mt-6"
                  onClick={handleClose}
                >
                  Close
                </Button>
              </motion.div>
            ) : (
              <>
                <h2 className="text-xl font-semibold tracking-tight text-[#1A3C34]">
                  Book Appointment
                </h2>
                <p className="mt-1 text-sm text-[#1A3C34]/80">
                  Step {step} of 3
                </p>

                <AnimatePresence mode="wait">
                  {step === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      className="mt-6 space-y-4"
                    >
                      <label className="block text-sm font-medium text-[#1A3C34]">
                        Select Treatment
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {TREATMENTS.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setTreatment(t.id)}
                            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                              treatment === t.id
                                ? "bg-[#1A3C34] text-[#F9F7F2]"
                                : "bg-[#D4DCD6]/50 text-[#1A3C34]/80 hover:bg-[#D4DCD6]"
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      className="mt-6"
                    >
                      <label
                        htmlFor="date"
                        className="block text-sm font-medium text-[#1A3C34]"
                      >
                        Pick Date
                      </label>
                      <input
                        id="date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        className="mt-2 w-full rounded-xl border border-[#D4DCD6] bg-[#F9F7F2] px-4 py-3 text-[#1A3C34] focus:border-[#1A3C34] focus:outline-none focus:ring-1 focus:ring-[#1A3C34]"
                      />
                    </motion.div>
                  )}

                  {step === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      className="mt-6 space-y-4"
                    >
                      <div>
                        <label
                          htmlFor="email"
                          className="block text-sm font-medium text-[#1A3C34]"
                        >
                          Email
                        </label>
                        <input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="mt-2 w-full rounded-xl border border-[#D4DCD6] bg-[#F9F7F2] px-4 py-3 text-[#1A3C34] placeholder:text-[#1A3C34]/50 focus:border-[#1A3C34] focus:outline-none focus:ring-1 focus:ring-[#1A3C34]"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="phone"
                          className="block text-sm font-medium text-[#1A3C34]"
                        >
                          Phone
                        </label>
                        <input
                          id="phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+1 (555) 000-0000"
                          className="mt-2 w-full rounded-xl border border-[#D4DCD6] bg-[#F9F7F2] px-4 py-3 text-[#1A3C34] placeholder:text-[#1A3C34]/50 focus:border-[#1A3C34] focus:outline-none focus:ring-1 focus:ring-[#1A3C34]"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-8 flex justify-between">
                  {step > 1 ? (
                    <Button
                      variant="secondary"
                      onClick={() => setStep((s) => s - 1)}
                    >
                      Back
                    </Button>
                  ) : (
                    <span />
                  )}
                  {step < 3 ? (
                    <Button
                      variant="primary"
                      onClick={() => setStep((s) => s + 1)}
                      disabled={
                        (step === 1 && !treatment) ||
                        (step === 2 && !date)
                      }
                    >
                      Next
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={handleSubmit}
                      disabled={!email || !phone || submitting}
                    >
                      {submitting ? "Sending…" : "Submit"}
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
