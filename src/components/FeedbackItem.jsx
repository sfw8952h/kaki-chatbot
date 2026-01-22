import { useState } from "react"
import { FiChevronDown, FiChevronUp, FiSend } from "react-icons/fi"

function FeedbackItem({ item, supabase, user }) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [reply, setReply] = useState(item.admin_reply || "")
    const [isSending, setIsSending] = useState(false)
    const [status, setStatus] = useState("")

    const handleSendReply = async () => {
        if (!reply.trim() || !supabase || !user) return

        setIsSending(true)
        setStatus("")

        try {
            const { error } = await supabase
                .from('feedback')
                .update({
                    admin_reply: reply,
                    replied_at: new Date().toISOString(),
                    replied_by: user.id
                })
                .eq('id', item.id)

            if (error) throw error

            setStatus("Reply sent successfully!")
            setTimeout(() => setStatus(""), 3000)
        } catch (err) {
            console.error('Failed to send reply:', err)
            setStatus("Failed to send reply")
        } finally {
            setIsSending(false)
        }
    }

    return (
        <div className="feedback-item-card">
            <div className="feedback-item-header" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="feedback-item-main">
                    <strong>{item.subject}</strong>
                    <p className="feedback-preview">{item.details}</p>
                </div>
                <div className="feedback-item-meta">
                    <span className="feedback-date">{item.created_at?.slice(0, 10) || "—"}</span>
                    {item.admin_reply && <span className="replied-badge">Replied</span>}
                    <button className="expand-btn">
                        {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className="feedback-item-body">
                    <div className="feedback-details">
                        <p className="label">Customer Message:</p>
                        <p>{item.details}</p>
                    </div>

                    <div className="feedback-reply-section">
                        <p className="label">Admin Reply:</p>
                        <textarea
                            value={reply}
                            onChange={(e) => setReply(e.target.value)}
                            placeholder="Type your reply to the customer..."
                            rows={4}
                            disabled={isSending}
                        />
                        <div className="reply-actions">
                            {status && <span className={`reply-status ${status.includes('success') ? 'success' : 'error'}`}>{status}</span>}
                            <button
                                className="primary-btn"
                                onClick={handleSendReply}
                                disabled={!reply.trim() || isSending}
                            >
                                <FiSend /> {isSending ? "Sending..." : "Send Reply"}
                            </button>
                        </div>
                    </div>

                    {item.replied_at && (
                        <div className="feedback-reply-info">
                            <small>Last replied: {new Date(item.replied_at).toLocaleString()}</small>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default FeedbackItem
