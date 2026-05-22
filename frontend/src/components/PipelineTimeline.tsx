import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Loader2, Minus, XCircle } from "lucide-react";
import { PIPELINE_STAGES, RUNNING_STATUSES, getStageIndex } from "../pipeline";
import type { ProjectStatus } from "../types";

const EASE_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function PipelineTimeline({
	status,
}: {
	status: ProjectStatus;
}) {
	const activeIndex = getStageIndex(status);
	const running = RUNNING_STATUSES.has(status);
	const reducedMotion = useReducedMotion();

	const transition = (duration: number) =>
		reducedMotion ? { duration: 0 } : { duration, ease: EASE_EXPO };

	return (
		<>
			{/* Compact mobile view */}
			<div
				role="status"
				aria-label="Pipeline progress"
				className="flex md:hidden items-center gap-3 px-1 py-2"
			>
				<div
					className="flex items-center justify-center w-7 h-7 rounded-full border border-lime/60 bg-lime/10 flex-shrink-0"
					aria-hidden="true"
				>
					{running ? (
						<Loader2 size={13} className="animate-spin text-lime" />
					) : (
						<span className="text-xs font-medium text-lime">
							{activeIndex + 1}
						</span>
					)}
				</div>
				<div className="flex flex-col gap-0.5 min-w-0">
					<span className="text-xs font-medium text-soft truncate">
						{PIPELINE_STAGES[activeIndex].label}
					</span>
					<span className="text-xs text-quiet">
						Step {activeIndex + 1} of {PIPELINE_STAGES.length}
					</span>
				</div>
			</div>

			{/* Full timeline */}
			<div className="hidden md:flex overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
				<ol
					className="flex items-center"
					aria-label="Project pipeline"
					style={{ minWidth: "max-content" }}
				>
					{PIPELINE_STAGES.map((stage, index) => {
						const isComplete = index < activeIndex;
						const isActive = index === activeIndex;
						const stateLabel = isComplete
							? "Completed"
							: isActive
								? "Current"
								: "Upcoming";

						// Connector between stage[i] and stage[i+1] is filled when stage[i+1] is active or complete
						const connectorFilled = index + 1 <= activeIndex;

						return (
							<li
								key={stage.id}
								className="flex items-center flex-shrink-0"
								aria-current={isActive ? "step" : undefined}
							>
								{/* Stage pill */}
								<div className="flex flex-col items-center gap-1.5 flex-shrink-0">
									<div
										className={[
											"flex items-center justify-center transition-all duration-300",
											isActive
												? [
														"w-8 h-8 rounded-lg border",
														status === "FAILED"
															? "border-danger/40 bg-danger/5"
															: status === "CANCELLED"
																? "border-white/20 bg-panel/50"
																: "border-lime/60 bg-lime/[0.08]",
													].join(" ")
												: "w-6 h-6 rounded-full border",
											isComplete
												? "border-white/20 bg-white/[0.06]"
												: isActive
													? ""
													: "border-white/15 bg-transparent",
										].join(" ")}
										style={
											isActive && running
												? {
														boxShadow:
															"0 0 0 1px oklch(0.82 0.19 132 / 0.4), 0 4px 16px oklch(0.82 0.19 132 / 0.15)",
													}
												: undefined
										}
										aria-hidden="true"
									>
										{isComplete && (
											<Check
												size={12}
												className="text-muted"
												strokeWidth={2.5}
											/>
										)}
										{isActive && running && (
											<Loader2 size={13} className="animate-spin text-lime" />
										)}
										{isActive && !running && status === "COMPLETED" && (
											<Check
												size={12}
												className="text-lime"
												strokeWidth={2.5}
											/>
										)}
										{isActive && !running && status === "FAILED" && (
											<XCircle size={13} className="text-danger" />
										)}
										{isActive && !running && status === "CANCELLED" && (
											<Minus size={13} className="text-muted" />
										)}
										{isActive &&
											!running &&
											status !== "COMPLETED" &&
											status !== "FAILED" &&
											status !== "CANCELLED" && (
												<motion.span
													className="size-1.5 rounded-full bg-lime"
													animate={{ opacity: [0.4, 1, 0.4] }}
													transition={{
														duration: 1.2,
														repeat: Infinity,
														ease: [0.4, 0, 0.6, 1],
													}}
												/>
											)}
									</div>

									{/* Label */}
									<span
										className={[
											"text-xs",
											isComplete
												? "text-muted"
												: isActive
													? "font-medium text-soft"
													: "text-quiet",
										].join(" ")}
									>
										<span className="sr-only">{stateLabel}: </span>
										{isActive ? (
											<AnimatePresence mode="wait">
												<motion.span
													key={stage.id}
													initial={{ opacity: 0, y: 4 }}
													animate={{ opacity: 1, y: 0 }}
													exit={{ opacity: 0, y: -4 }}
													transition={transition(0.2)}
													style={{ display: "inline-block" }}
												>
													{stage.label}
												</motion.span>
											</AnimatePresence>
										) : (
											stage.label
										)}
									</span>
								</div>

								{/* Connector to next stage */}
								{index < PIPELINE_STAGES.length - 1 && (
									<div className="relative mx-2 h-px w-10 overflow-hidden flex-shrink-0">
										{/* Background dim line */}
										<div className="absolute inset-0 bg-white/10" />
										{/* Lime fill */}
										<motion.div
											className="absolute inset-0 bg-lime"
											initial={{ scaleX: connectorFilled ? 1 : 0 }}
											animate={{ scaleX: connectorFilled ? 1 : 0 }}
											transition={transition(0.5)}
											style={{ originX: "left" }}
										/>
									</div>
								)}
							</li>
						);
					})}
				</ol>
			</div>
		</>
	);
}
