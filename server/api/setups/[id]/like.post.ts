import { handleLike } from '../../../utils/likes'

export default defineEventHandler((event) => handleLike(event, true))
